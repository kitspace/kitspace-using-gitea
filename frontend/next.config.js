const withCss = require('@zeit/next-css')
const withSass = require('@zeit/next-sass')

module.exports = withSass(
  withCss({
    env: {
      KITSPACE_GITEA_URL: process.env.KITSPACE_GITEA_URL,
    },
    webpack(config) {
      // Fixes npm packages that depend on `fs` module
      config.node = {
        fs: 'empty',
      }
      config.module.rules.push({
        test: /\.(png|svg|eot|otf|ttf|woff|woff2)$/,
        use: {
          loader: 'file-loader',
          options: {
            publicPath: '/error_pages/_next/static/',
            outputPath: 'static',
            name: '[name].[hash].[ext]',
          },
        },
      })

      return config
    },
    assetPrefix: '/error_pages',
    exportPathMap() {
      const codes = [
        400,
        401,
        402,
        403,
        404,
        405,
        406,
        407,
        408,
        409,
        410,
        411,
        412,
        413,
        414,
        415,
        416,
        417,
        418,
        421,
        422,
        423,
        424,
        425,
        426,
        428,
        429,
        431,
        451,
        500,
        501,
        502,
        503,
        504,
        505,
        506,
        507,
        508,
        510,
        511,
      ]
      const map = {}
      codes.forEach(err => {
        map[err] = { page: '/_error', query: { staticStatusCode: err } }
      })
      return map
    },
  }),
)
