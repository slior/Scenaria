const path = require('path');

module.exports = {
    mode : "development",
    entry: './src/AppMain.js',
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, '.'),
        library : 'main',
        libraryTarget : 'var'
    }
};