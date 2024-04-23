import path from 'node:path'
import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import Vue from '@vitejs/plugin-vue2'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import VueMacros from 'unplugin-vue-macros/dist/vite'
import UnoCSS from 'unocss/vite'
import legacy from '@vitejs/plugin-legacy'
import Pages from 'vite-plugin-pages'
import Layouts from 'vite-plugin-vue-layouts'
import Inspector from 'vite-plugin-vue-inspector'
import Compression from 'unplugin-compression/vite'
import webfontDownload from 'vite-plugin-webfont-dl'
import Markdown from 'unplugin-vue-markdown/vite'
import Shiki from '@shikijs/markdown-it'
import anchor from 'markdown-it-anchor'
import { name } from './package.json'
import CreateDir from './plugins/create-dir'
import LimitFile from './plugins/file-limit'
import { TimeUnit, genCompactFullDate, isTimeAgo, parseCompactFullDate } from './src/logics/utils/time'
import { moveMatchToEnd } from './src/logics/utils/array'

export default defineConfig(({ mode }) => {
  // load env variables according to mode
  const env = loadEnv(mode, process.cwd(), '')
  return {
    define: {
      __APP_ENV__: env.APP_ENV,
    },
    resolve: {
      alias: {
        '~/': `${path.resolve(__dirname, 'src')}/`,
      },
    },
    build: {
      copyPublicDir: true,
      cssTarget: 'chrome49',
      emptyOutDir: true,
    },
    preview: {
      cors: true,
    },
    plugins: [
      /**
       * https://github.com/vue-macros/vue-macros
       */
      VueMacros({
        defineProp: {
          edition: 'johnsonEdition',
        },
        plugins: {
          vue: Vue({
            include: [/\.vue$/, /\.setup\.[cm]?[jt]sx?$/, /\.md$/],
          }),
          // vueJsx: VueJsx(), // if needed
        },
      }),

      /**
       * https://github.com/unplugin/unplugin-auto-import
       */
      AutoImport({
        // targets to transform
        include: [
          /\.[tj]sx?$/, // .ts, .tsx, .js, .jsx
          /\.vue$/,
          /\.vue\?vue/, // .vue
        ],
        imports: [
          'vue',
          'vue-router/composables',
          {
            from: 'vue-router',
            imports: ['RouteLocationRaw'],
            type: true,
          },
          {
            consola: [
              'consola',
            ],
          },
        ],
        dts: 'src/auto-imports.d.ts',
      }),

      /**
       * https://github.com/antfu/vite-plugin-components
       */
      Layouts({
        layoutsDirs: 'src/layouts',
        defaultLayout: 'default',
      }),

      /**
       * https://github.com/hannoeru/vite-plugin-pages
       */
      Pages({
        routeBlockLang: 'yaml',
        dirs: [
          {
            dir: 'src/pages',
            baseRoute: '',
            filePattern: '**\/*.*',
          },
        ],
        extensions: ['vue', 'md'],
        exclude: ['**/components/*.vue'],
        onRoutesGenerated: (routes) => {
          moveMatchToEnd(routes, route => route.path === '/:all(.*)*')
          return routes
        },
      }),

      /**
       * https://github.com/unplugin/unplugin-vue-markdown
       */
      Markdown({
        wrapperClasses: 'prose m-auto text-left',
        async markdownItSetup(md) {
          md.use(await Shiki({
            themes: {
              light: 'vitesse-light',
              dark: 'vitesse-black',
            },
          }))
          md.use(anchor, {
            permalink: anchor.permalink.linkInsideHeader({
              symbol: '#',
              ariaHidden: true,
              placement: 'before',
            }),
          })
        },
      }),

      /**
       * `Components` should be after `Markdown`
       * https://github.com/unplugin/unplugin-vue-components
       */
      Components({
        extensions: ['vue', 'md'],
        include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
        dts: 'src/components.d.ts',
      }),

      /**
       * https://github.com/unocss/unocss
       */
      UnoCSS(),

      /**
       * https://github.com/vitejs/vite/tree/main/packages/plugin-legacy
       */
      legacy({
        targets: ['cover 99.5% in CN', 'not IE 11'],
      }),

      /**
       * https://github.com/webfansplz/vite-plugin-vue-inspector
       */
      Inspector({
        vue: 2,
      }),

      /**
       * https://github.com/feat-agency/vite-plugin-webfont-dl
       */
      webfontDownload(),

      /**
       * plugins/create-dir.ts
       */
      CreateDir({
        dirs: ['./pkg'],
      }),

      /**
       * https://github.com/KeJunMao/unplugin-compression
       */
      Compression({
        adapter: 'zip',
        source: 'dist',
        outDir: './pkg',
        formatter(source) {
          return `${name}.${genCompactFullDate(new Date())}.${source.adapter}`
        },
      }),

      /**
       * plugins/limit-file.ts
       */
      LimitFile({
        path: './pkg',
        limit: 20,
        customFilter(fileName) {
          const [_, date, __] = fileName.split('.')
          const createTime = parseCompactFullDate(date)
          return isTimeAgo(createTime, { unit: TimeUnit.MONTH, times: 4 })
        },
      }),
    ],
  }
})
