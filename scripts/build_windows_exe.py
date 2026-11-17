#!/usr/bin/env python3
"""
Builds the standalone Windows 11 Desktop Executable:
`Win11-Update-Notifier-Windows.exe`

Bundles the compiled Vite + React + Tailwind application (including the
Summary Tab, live Microsoft multi-table scraper & GitHub state sync,
WUB Safe-Window Guard, and Discord @everyone priority notifier) into a
single native Windows GUI executable (.exe) that launches in standalone
Desktop App mode (msedge.exe --app=... with automatic default browser fallback).
"""
import glob
import os
import re
import shutil
import struct
import subprocess


DIST_DIR = "dist"
OUTPUT_EXE = "Win11-Update-Notifier-Windows.exe"


def build_inlined_index_html() -> str:
    """Inlines compiled Vite CSS and JS bundles into a single self-contained HTML string."""
    index_path = os.path.join(DIST_DIR, "index.html")
    if not os.path.exists(index_path):
        raise FileNotFoundError(
            f"{index_path} not found. Run `npm run build` (or `npx vite build`) before building the .exe."
        )

    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    css_contents = []
    for css_file in sorted(glob.glob(os.path.join(DIST_DIR, "assets", "*.css"))):
        with open(css_file, "r", encoding="utf-8") as cf:
            css_contents.append(cf.read())

    js_contents = []
    for js_file in sorted(glob.glob(os.path.join(DIST_DIR, "assets", "*.js"))):
        with open(js_file, "r", encoding="utf-8") as jf:
            js_contents.append(jf.read())

    html = re.sub(r'<link[^>]+href="[^"]*assets/[^"]+\.css"[^>]*>', "", html)
    html = re.sub(r'<script[^>]+src="[^"]*assets/[^"]+\.js"[^>]*></script>', "", html)
    html = re.sub(r'<script[^>]+src="[^"]*registerSW\.js"[^>]*></script>', "", html)
    html = re.sub(r'<link[^>]+rel="manifest"[^>]*>', "", html)

    if css_contents:
        combined_css = "\n".join(css_contents)
        html = html.replace("</head>", f"<style>\n{combined_css}\n</style>\n</head>")

    if js_contents:
        combined_js = "\n".join(js_contents)
        html = html.replace(
            "</body>", f'<script type="module">\n{combined_js}\n</script>\n</body>'
        )

    return html


def align(val: int, alignment: int) -> int:
    return (val + alignment - 1) & ~(alignment - 1)


def build_pe32_gui_exe(html_bytes: bytes) -> bytes:
    """
    Constructs a native Windows PE32 GUI executable (IMAGE_SUBSYSTEM_WINDOWS_GUI)
    that extracts the embedded UTF-8 HTML bundle to %TEMP%\\Win11-Update-Notifier.html
    and launches it in a standalone desktop window via Microsoft Edge (--app=...)
    with automatic fallback to the default system browser.
    """
    image_base = 0x00400000
    sect_align = 0x1000
    file_align = 0x200

    text_rva = 0x1000
    rdata_rva = 0x2000

    html_len = len(html_bytes)

    # Layout inside .text section (RVA 0x1000):
    # 0x0000 .. 0x00FF : Machine code entry point
    # 0x0100 .. 0x014F : Import Directory Table (3 entries: kernel32, shell32, null)
    # 0x0150 .. 0x016F : ILT for kernel32 (6 functions + null)
    # 0x0170 .. 0x017F : ILT for shell32 (1 function + null)
    # 0x0200 .. 0x021F : IAT for kernel32 (6 functions + null) -> VA 0x00401200
    # 0x0220 .. 0x022F : IAT for shell32 (1 function + null)  -> VA 0x00401220
    # 0x0240 .. 0x035F : Hint/Name table & DLL name strings
    # 0x0360 .. 0x03FF : Application string constants

    text_buf = bytearray(0x1000)

    def put_str(offset: int, s: str) -> int:
        b = s.encode("ascii") + b"\x00"
        text_buf[offset : offset + len(b)] = b
        return offset + len(b)

    def put_hint_name(offset: int, name: str) -> tuple[int, int]:
        if offset % 2 == 1:
            offset += 1
        rva = text_rva + offset
        struct.pack_into("<H", text_buf, offset, 0)
        end = put_str(offset + 2, name)
        return rva, end

    hn_offset = 0x0240
    rva_GetTempPathA, hn_offset = put_hint_name(hn_offset, "GetTempPathA")
    rva_lstrcatA, hn_offset = put_hint_name(hn_offset, "lstrcatA")
    rva_CreateFileA, hn_offset = put_hint_name(hn_offset, "CreateFileA")
    rva_WriteFile, hn_offset = put_hint_name(hn_offset, "WriteFile")
    rva_CloseHandle, hn_offset = put_hint_name(hn_offset, "CloseHandle")
    rva_ExitProcess, hn_offset = put_hint_name(hn_offset, "ExitProcess")
    rva_ShellExecuteA, hn_offset = put_hint_name(hn_offset, "ShellExecuteA")

    rva_kernel32_name = text_rva + hn_offset
    hn_offset = put_str(hn_offset, "KERNEL32.dll")
    rva_shell32_name = text_rva + hn_offset
    hn_offset = put_str(hn_offset, "SHELL32.dll")

    # Application string constants at 0x0360
    str_offset = 0x0360
    va_str_filename = image_base + text_rva + str_offset
    str_offset = put_str(str_offset, "Win11-Update-Notifier.html")

    va_str_prefix = image_base + text_rva + str_offset
    str_offset = put_str(str_offset, '--window-size=1280,860 --app="')

    va_str_quote = image_base + text_rva + str_offset
    str_offset = put_str(str_offset, '"')

    va_str_msedge = image_base + text_rva + str_offset
    str_offset = put_str(str_offset, "msedge.exe")

    va_str_open = image_base + text_rva + str_offset
    str_offset = put_str(str_offset, "open")

    # Populate ILT & IAT for KERNEL32.dll
    k32_funcs = [
        rva_GetTempPathA,
        rva_lstrcatA,
        rva_CreateFileA,
        rva_WriteFile,
        rva_CloseHandle,
        rva_ExitProcess,
        0,
    ]
    for i, fn_rva in enumerate(k32_funcs):
        struct.pack_into("<I", text_buf, 0x0150 + i * 4, fn_rva)
        struct.pack_into("<I", text_buf, 0x0200 + i * 4, fn_rva)

    # Populate ILT & IAT for SHELL32.dll
    sh32_funcs = [rva_ShellExecuteA, 0]
    for i, fn_rva in enumerate(sh32_funcs):
        struct.pack_into("<I", text_buf, 0x0170 + i * 4, fn_rva)
        struct.pack_into("<I", text_buf, 0x0220 + i * 4, fn_rva)

    # Populate Import Directory Table at 0x0100 (RVA 0x1100)
    # Entry 0: KERNEL32.dll
    struct.pack_into(
        "<IIIII",
        text_buf,
        0x0100,
        text_rva + 0x0150,  # OriginalFirstThunk (ILT RVA)
        0,                  # TimeDateStamp
        0,                  # ForwarderChain
        rva_kernel32_name,  # Name RVA
        text_rva + 0x0200,  # FirstThunk (IAT RVA)
    )
    # Entry 1: SHELL32.dll
    struct.pack_into(
        "<IIIII",
        text_buf,
        0x0114,
        text_rva + 0x0170,  # OriginalFirstThunk (ILT RVA)
        0,
        0,
        rva_shell32_name,   # Name RVA
        text_rva + 0x0220,  # FirstThunk (IAT RVA)
    )
    # Entry 2: Null terminator (20 zero bytes at 0x0128)

    # IAT Virtual Addresses
    iat_GetTempPathA = image_base + text_rva + 0x0200
    iat_lstrcatA = image_base + text_rva + 0x0204
    iat_CreateFileA = image_base + text_rva + 0x0208
    iat_WriteFile = image_base + text_rva + 0x020C
    iat_CloseHandle = image_base + text_rva + 0x0210
    iat_ExitProcess = image_base + text_rva + 0x0214
    iat_ShellExecuteA = image_base + text_rva + 0x0220

    va_html_data = image_base + rdata_rva

    # Assemble x86 machine code at 0x0000 (EntryPoint RVA 0x1000)
    code = bytearray()

    # sub esp, 0x400 ; mov ebp, esp
    code += b"\x81\xec\x00\x04\x00\x00"
    code += b"\x89\xe5"

    # GetTempPathA(260, ebp)
    code += b"\x55"                                      # push ebp
    code += b"\x68" + struct.pack("<I", 260)             # push 260
    code += b"\xff\x15" + struct.pack("<I", iat_GetTempPathA)

    # lstrcatA(ebp, va_str_filename)
    code += b"\x68" + struct.pack("<I", va_str_filename)
    code += b"\x55"                                      # push ebp
    code += b"\xff\x15" + struct.pack("<I", iat_lstrcatA)

    # CreateFileA(ebp, 0x40000000, 0, 0, 2, 0x80, 0)
    code += b"\x6a\x00"                                  # push 0
    code += b"\x68" + struct.pack("<I", 0x80)            # push FILE_ATTRIBUTE_NORMAL
    code += b"\x6a\x02"                                  # push CREATE_ALWAYS
    code += b"\x6a\x00"                                  # push 0
    code += b"\x6a\x00"                                  # push 0
    code += b"\x68" + struct.pack("<I", 0x40000000)      # push GENERIC_WRITE
    code += b"\x55"                                      # push ebp
    code += b"\xff\x15" + struct.pack("<I", iat_CreateFileA)
    code += b"\x89\xc6"                                  # mov esi, eax

    # WriteFile(esi, va_html_data, html_len, ebp + 0x3FC, 0)
    code += b"\x6a\x00"                                  # push 0
    code += b"\x8d\x85\xfc\x03\x00\x00"                  # lea eax, [ebp + 0x3FC]
    code += b"\x50"                                      # push eax
    code += b"\x68" + struct.pack("<I", html_len)        # push html_len
    code += b"\x68" + struct.pack("<I", va_html_data)    # push va_html_data
    code += b"\x56"                                      # push esi
    code += b"\xff\x15" + struct.pack("<I", iat_WriteFile)

    # CloseHandle(esi)
    code += b"\x56"                                      # push esi
    code += b"\xff\x15" + struct.pack("<I", iat_CloseHandle)

    # Build Edge args in edi = ebp + 0x200
    code += b"\x8d\xbd\x00\x02\x00\x00"                  # lea edi, [ebp + 0x200]
    code += b"\xc6\x07\x00"                              # mov byte ptr [edi], 0

    # lstrcatA(edi, va_str_prefix)
    code += b"\x68" + struct.pack("<I", va_str_prefix)
    code += b"\x57"                                      # push edi
    code += b"\xff\x15" + struct.pack("<I", iat_lstrcatA)

    # lstrcatA(edi, ebp)
    code += b"\x55"                                      # push ebp
    code += b"\x57"                                      # push edi
    code += b"\xff\x15" + struct.pack("<I", iat_lstrcatA)

    # lstrcatA(edi, va_str_quote)
    code += b"\x68" + struct.pack("<I", va_str_quote)
    code += b"\x57"                                      # push edi
    code += b"\xff\x15" + struct.pack("<I", iat_lstrcatA)

    # ShellExecuteA(0, "open", "msedge.exe", edi, 0, 1)
    code += b"\x6a\x01"                                  # push SW_SHOWNORMAL
    code += b"\x6a\x00"                                  # push 0
    code += b"\x57"                                      # push edi
    code += b"\x68" + struct.pack("<I", va_str_msedge)   # push "msedge.exe"
    code += b"\x68" + struct.pack("<I", va_str_open)     # push "open"
    code += b"\x6a\x00"                                  # push 0
    code += b"\xff\x15" + struct.pack("<I", iat_ShellExecuteA)

    # If eax <= 32, fallback to ShellExecuteA(0, "open", ebp, 0, 0, 1)
    code += b"\x83\xf8\x20"                              # cmp eax, 32
    code += b"\x7f\x14"                                  # jg +20 bytes (skip fallback)

    code += b"\x6a\x01"                                  # push 1
    code += b"\x6a\x00"                                  # push 0
    code += b"\x6a\x00"                                  # push 0
    code += b"\x55"                                      # push ebp
    code += b"\x68" + struct.pack("<I", va_str_open)     # push "open"
    code += b"\x6a\x00"                                  # push 0
    code += b"\xff\x15" + struct.pack("<I", iat_ShellExecuteA)

    # ExitProcess(0)
    code += b"\x6a\x00"                                  # push 0
    code += b"\xff\x15" + struct.pack("<I", iat_ExitProcess)

    text_buf[0 : len(code)] = code
    text_raw = bytes(text_buf[:0x400])  # 1024 bytes (aligned to 0x200)

    rdata_raw_size = align(html_len, file_align)
    rdata_virt_size = align(html_len, sect_align)
    rdata_buf = bytearray(rdata_raw_size)
    rdata_buf[0:html_len] = html_bytes

    size_of_headers = 0x200
    size_of_image = rdata_rva + rdata_virt_size

    headers = bytearray(size_of_headers)
    # DOS Header
    headers[0:2] = b"MZ"
    struct.pack_into("<I", headers, 0x3C, 0x80)  # e_lfanew = 0x80

    # PE Signature + COFF File Header at 0x80
    pe_off = 0x80
    headers[pe_off : pe_off + 4] = b"PE\x00\x00"
    struct.pack_into(
        "<HHIIIHH",
        headers,
        pe_off + 4,
        0x014C,  # Machine = IMAGE_FILE_MACHINE_I386
        2,       # NumberOfSections = 2 (.text, .rdata)
        0,       # TimeDateStamp
        0,       # PointerToSymbolTable
        0,       # NumberOfSymbols
        0x00E0,  # SizeOfOptionalHeader
        0x010F,  # Characteristics (EXECUTABLE_IMAGE | 32BIT_MACHINE | RELOCS_STRIPPED)
    )

    # Optional Header (PE32) at pe_off + 24 (0x98)
    opt_off = pe_off + 24
    struct.pack_into(
        "<HBBIIIIIIIIIHHHHHHIIIIHHIIIIII",
        headers,
        opt_off,
        0x010B,             # Magic = PE32
        14,                 # MajorLinkerVersion
        0,                  # MinorLinkerVersion
        len(text_raw),      # SizeOfCode
        rdata_raw_size,     # SizeOfInitializedData
        0,                  # SizeOfUninitializedData
        text_rva,           # AddressOfEntryPoint (0x1000)
        text_rva,           # BaseOfCode (0x1000)
        rdata_rva,          # BaseOfData (0x2000)
        image_base,         # ImageBase (0x00400000)
        sect_align,         # SectionAlignment (0x1000)
        file_align,         # FileAlignment (0x200)
        6,                  # MajorOperatingSystemVersion
        0,                  # MinorOperatingSystemVersion
        1,                  # MajorImageVersion
        2,                  # MinorImageVersion
        6,                  # MajorSubsystemVersion
        0,                  # MinorSubsystemVersion
        0,                  # Win32VersionValue
        size_of_image,      # SizeOfImage
        size_of_headers,    # SizeOfHeaders (0x200)
        0,                  # CheckSum
        2,                  # Subsystem = IMAGE_SUBSYSTEM_WINDOWS_GUI (2)
        0,                  # DllCharacteristics
        0x100000,           # SizeOfStackReserve
        0x1000,             # SizeOfStackCommit
        0x100000,           # SizeOfHeapReserve
        0x1000,             # SizeOfHeapCommit
        0,                  # LoaderFlags
        16,                 # NumberOfRvaAndSizes
    )

    # Data Directories start at opt_off + 96 (0xF8)
    # Import Table is DataDirectory[1] at opt_off + 96 + 8
    struct.pack_into("<II", headers, opt_off + 96 + 8, text_rva + 0x0100, 0x3C)
    # IAT is DataDirectory[12] at opt_off + 96 + 96
    struct.pack_into("<II", headers, opt_off + 96 + 96, text_rva + 0x0200, 0x30)

    # Section Headers start at opt_off + 0xE0 (0x178)
    sect_table_off = opt_off + 0xE0

    # Section 1: .text
    struct.pack_into(
        "<8sIIIIIIHHI",
        headers,
        sect_table_off,
        b".text\x00\x00\x00",
        0x1000,             # VirtualSize
        text_rva,           # VirtualAddress (0x1000)
        len(text_raw),      # SizeOfRawData (0x400)
        size_of_headers,    # PointerToRawData (0x200)
        0,
        0,
        0,
        0,
        0xE0000020,         # Characteristics (CODE | EXECUTE | READ | WRITE)
    )

    # Section 2: .rdata
    struct.pack_into(
        "<8sIIIIIIHHI",
        headers,
        sect_table_off + 40,
        b".rdata\x00\x00",
        html_len,                           # VirtualSize
        rdata_rva,                          # VirtualAddress (0x2000)
        rdata_raw_size,                     # SizeOfRawData
        size_of_headers + len(text_raw),    # PointerToRawData (0x600)
        0,
        0,
        0,
        0,
        0x40000040,                         # Characteristics (INITIALIZED_DATA | READ)
    )

    return bytes(headers) + text_raw + bytes(rdata_buf)


def main() -> None:
    html = build_inlined_index_html()
    html_bytes = html.encode("utf-8")
    exe_bytes = build_pe32_gui_exe(html_bytes)

    with open(OUTPUT_EXE, "wb") as f:
        f.write(exe_bytes)

    os.makedirs("public", exist_ok=True)
    shutil.copyfile(OUTPUT_EXE, os.path.join("public", OUTPUT_EXE))

    print(
        f"Built {OUTPUT_EXE} ({len(exe_bytes):,} bytes, embedded HTML: {len(html_bytes):,} bytes)"
    )


if __name__ == "__main__":
    main()
