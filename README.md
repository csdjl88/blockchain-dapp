window环境
1. 下载并安装[Ganache](https://github.com/trufflesuite/ganache-ui/releases/download/v2.7.1/Ganache-2.7.1-win-x64-setup.exe)
2. 安装Truffle  npm install -g truffle
3. 本地nodeJS>18
4. 下载源码
5. npm install 安装依赖
6. 启动Ganache
7. 修改配置文件truffle-config.js，networks配置为你本地Ganache的IP地址和端口
8. 命令行  truffle test  .\test\Exchange.test.js