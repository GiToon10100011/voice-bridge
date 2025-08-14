const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const target = env?.target || 'chrome'; // chrome, edge, firefox
  
  console.log(`🔧 Building for ${target} in ${argv.mode} mode`);
  
  return {
    entry: {
      'background/background': './src/background/background.js',
      'content/content': './src/content/content.js',
      'popup/popup': './src/popup/popup.js',
      'settings/settings': './src/settings/settings.js'
    },
    
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true
    },
    
    devtool: isProduction ? false : 'source-map',
    
    optimization: {
      minimize: isProduction,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
    },
    
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: {
                    chrome: '88',
                    edge: '88'
                  }
                }]
              ]
            }
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/,
          type: 'asset/resource',
          generator: {
            filename: 'icons/[name][ext]'
          }
        }
      ]
    },
    
    plugins: [
      new CopyPlugin({
        patterns: [
          // Manifest 파일 (타겟별 다른 설정 가능)
          {
            from: getManifestPath(target),
            to: 'manifest.json'
          },
          
          // HTML 파일들
          {
            from: 'src/popup/popup.html',
            to: 'popup/popup.html'
          },
          {
            from: 'src/settings/settings.html',
            to: 'settings/settings.html'
          },
          
          // CSS 파일들
          {
            from: 'src/popup/popup.css',
            to: 'popup/popup.css'
          },
          {
            from: 'src/settings/settings.css',
            to: 'settings/settings.css'
          },
          
          // 아이콘 파일들
          {
            from: 'icons/',
            to: 'icons/'
          },
          
          // 라이브러리 파일들 (직접 복사)
          {
            from: 'src/lib/',
            to: 'lib/'
          }
        ]
      })
    ],
    
    resolve: {
      extensions: ['.js', '.json'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@lib': path.resolve(__dirname, 'src/lib'),
        '@background': path.resolve(__dirname, 'src/background'),
        '@content': path.resolve(__dirname, 'src/content'),
        '@popup': path.resolve(__dirname, 'src/popup'),
        '@settings': path.resolve(__dirname, 'src/settings')
      }
    },
    
    // 개발 서버 설정 (확장프로그램에서는 사용하지 않지만 설정)
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      compress: true,
      port: 9000,
      hot: false, // 확장프로그램에서는 HMR 사용 안함
    },
    
    // 성능 경고 설정
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 512000, // 500KB
      maxAssetSize: 512000
    },
    
    // 외부 라이브러리 설정
    externals: {
      // Chrome Extension API는 외부에서 제공
      'chrome': 'chrome'
    }
  };
};

/**
 * 타겟별 manifest 파일 경로 반환
 */
function getManifestPath(target) {
  switch (target) {
    case 'edge':
      return 'manifest.edge.json';
    case 'firefox':
      return 'manifest.firefox.json';
    case 'chrome':
    default:
      return 'manifest.json';
  }
}

/**
 * 개발 환경에서 사용할 추가 설정
 */
if (process.env.NODE_ENV === 'development') {
  module.exports.plugins = [
    ...module.exports.plugins,
    
    // 개발 환경에서만 사용할 플러그인들
    new (require('webpack')).DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development'),
      'process.env.DEBUG': JSON.stringify(true)
    })
  ];
}