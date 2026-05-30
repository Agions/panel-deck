import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'PanelFlow',
  description: 'AI驱动的专业视频脚本创作平台',
  srcDir: '.',
  srcExclude: ['plans/**', 'ui-redesign/**'],
  lang: 'zh-CN',
  cleanUrls: true,
  ignoreDeadLinks: true,
  base: '/panel-flow/',
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#0a0a0f' }],
  ],
  themeConfig: {
    siteTitle: 'PanelFlow',
    nav: [
      { text: '快速开始', link: '/getting-started/quick-start' },
      { text: '用户指南', link: '/user-guide/workflow-overview' },
      { text: '开发指南', link: '/developer-guide/architecture' },
      { text: 'API', link: '/api/overview' },
    ],
    sidebar: {
      '/getting-started/': [
        {
          text: '入门指南',
          items: [
            { text: '快速开始', link: '/getting-started/quick-start' },
            { text: '安装', link: '/getting-started/installation' },
            { text: '配置', link: '/getting-started/configuration' },
          ],
        },
      ],
      '/user-guide/': [
        {
          text: '用户指南',
          items: [
            { text: '工作流程', link: '/user-guide/workflow-overview' },
            { text: '导入与分析', link: '/user-guide/import-analysis' },
            { text: '脚本生成', link: '/user-guide/script-generation' },
            { text: '分镜设计', link: '/user-guide/storyboard-design' },
            { text: '角色设计', link: '/user-guide/character-design' },
            { text: '渲染导出', link: '/user-guide/rendering-export' },
          ],
        },
      ],
      '/developer-guide/': [
        {
          text: '开发指南',
          items: [
            { text: '架构', link: '/developer-guide/architecture' },
            { text: '项目结构', link: '/developer-guide/project-structure' },
            { text: '服务', link: '/developer-guide/services' },
          ],
        },
      ],
      '/deployment/': [
        {
          text: '部署',
          items: [
            { text: '构建', link: '/deployment/build' },
            { text: '环境变量', link: '/deployment/environment' },
            { text: 'Docker', link: '/deployment/docker' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: '概述', link: '/api/overview' },
            { text: 'AI 服务', link: '/api/ai-service' },
            { text: '图像生成', link: '/api/image-generation' },
            { text: 'TTS 服务', link: '/api/tts-service' },
            { text: '流水线', link: '/api/pipeline-service' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Agions/PanelFlow' },
    ],
    footer: {
      message: 'MIT License © 2026 Agions',
    },
    search: { provider: 'local' },
  },
})
