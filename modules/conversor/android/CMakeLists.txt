cmake_minimum_required(VERSION 3.22.1)
project(conversor C)

# libwebp 1.6.0 vendorizado (ver docs/adr/0003): solo las bibliotecas, sin
# las herramientas de línea de comandos.
foreach(opcion WEBP_BUILD_ANIM_UTILS WEBP_BUILD_CWEBP WEBP_BUILD_DWEBP
               WEBP_BUILD_GIF2WEBP WEBP_BUILD_IMG2WEBP WEBP_BUILD_VWEBP
               WEBP_BUILD_WEBPINFO WEBP_BUILD_WEBPMUX WEBP_BUILD_EXTRAS)
  set(${opcion} OFF CACHE BOOL "" FORCE)
endforeach()
set(WEBP_BUILD_LIBWEBPMUX ON CACHE BOOL "" FORCE)
# En debug, Gradle compila sin optimizar (-O0) y codificar se vuelve muchas
# veces más lento: libwebp se optimiza siempre, también en los tests.
string(APPEND CMAKE_C_FLAGS_DEBUG " -O2")
add_subdirectory(third_party/libwebp EXCLUDE_FROM_ALL)

add_library(webpanimado SHARED src/main/cpp/webp_animado.c)
target_link_libraries(webpanimado libwebpmux webp jnigraphics)
