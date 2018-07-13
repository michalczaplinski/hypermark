module.exports = {
  module: {
    rules: [
      { test: /\.css$/, use: "css-loader" },
      {
        test: /\.(png|jpg|gif|svg)$/,
        use: [
          {
            loader: "file-loader",
            options: {}
          }
        ]
      }
    ]
  }
};
