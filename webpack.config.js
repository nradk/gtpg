const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
    mode: 'development',
    entry: './src/index.ts',
    devtool: 'inline-source-map',
    plugins: [
        new HtmlWebpackPlugin({
            title: 'Graph Theory Playground',
            template: 'src/index.html',
            baseUrl: process.env.NODE_ENV == 'development'?'/':'/graph-theory-playground/'
        }),
    ],
    output: {
        clean: true,
        filename: 'bundle.js',
        sourceMapFilename: 'bundle.js.map',
    },
    devServer: {
        contentBase: './dist',
    },
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                include: path.resolve(__dirname, './node_modules/bootstrap-icons/font/fonts'),
                use: {
                    loader: 'file-loader',
                    options: {
                        name: '[name].[ext]',
                        outputPath: 'webfonts',
                        publicPath: 'webfonts',
                    },
                }
            }
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    }
};
