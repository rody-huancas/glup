// The webview says which system it runs on (WebView2 on Windows: "Windows NT").
export const isWindows = (userAgent: string = typeof navigator === 'undefined' ? '' : navigator.userAgent): boolean =>
  /Windows/i.test(userAgent);
