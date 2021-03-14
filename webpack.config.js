const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    mode: 'development',
    plugins: [
        new HtmlWebpackPlugin({
            title: 'Graph Theory Playground',
            template: 'src/index.html',
        }),
    ],
    output: {
        clean: true,
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
        ],
    },
};
