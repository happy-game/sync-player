interface ImportMetaEnv {
  // 服务器配置
  VITE_API_BASE_URL: string
  VITE_WS_BASE_URL: string
  
  // 调试配置
  VITE_DEBUG: string
  
  // 其他配置
  VITE_APP_TITLE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 