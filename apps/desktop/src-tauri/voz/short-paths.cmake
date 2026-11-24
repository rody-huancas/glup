# whisper.cpp builds its Vulkan shader generator as an ExternalProject deep inside Cargo's build folder.
# Past 260 characters MSVC (cl.exe and MSBuild's tracker) cannot open its files, so that one project is
# built in target/vk instead. Passed by voz/build.ps1 as CMAKE_PROJECT_INCLUDE.
set_property(DIRECTORY PROPERTY EP_BASE "${CMAKE_CURRENT_LIST_DIR}/../target/vk")
