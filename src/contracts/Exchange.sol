// SPDX-License-Identifier: MIT
// 存入、提取资金
// 订单管理
// 填单
// 交易，收取费用
pragma solidity ^0.8.13;

import "./Token.sol";
import "openzeppelin-solidity/contracts/utils/math/SafeMath.sol";
// TODO:
// [X] 设置手续费
// [X] 存入 ether
// [X] 提取 ether
// [X] 存入 token
// [X] 提取 token
// [X] 余额检查
// [X] 创建订单
// [X] 取消订单
// [] 填充订单
// [] 收取费用

// 交易所
contract Exchange {
    using SafeMath for uint;
    address public feeAccount; //接收交易费用的账户
    uint256 public feePercent; // 交易费率
    address constant ETHER = address(0); //constant 常量  默认0为以太坊地址
    // 第一个地址：token地址，第二个地址：存入代币的用户地址
    // 第一层对象是目前有存储的所有代币地址 他们对应的值 是 这个代币下 每个用户 值对应拥有的数量
    // {
//     "A代币地址":{
//         "A用户地址": 300,
//         "B用户地址": 400
//     },
//     "B代币地址": {
//         "A用户地址": 500
//     }
// }
    mapping(address => mapping(address => uint256)) public tokens; // 代币 => (实际用户地址 => 用户持有的代币数量)


    mapping(uint256 => _Order) public orders; // uint256相当于ID

    uint256 public orderCount; // 相当于订单自增ID

    mapping(uint256 => bool) public orderCancel;

    // 存款事件
    event Deposit(address token, address user, uint256 amount, uint256 balance);
    // 提款事件
    event Withdraw(address token, address user, uint256 amount, uint256 balance);
    // 订单事件
    event Order(uint256 id, address user, address tokenGet, uint256 amountGet, address tokenGive, uint256 amountGive, uint256 timestamp);
    event Cancel(uint256 id, address user, address tokenGet, uint256 amountGet, address tokenGive, uint256 amountGive, uint256 timestamp);

    // TODO:
    // [X] 建立一个订单model
    // [x] mapping 储存订单的方法
    // [x] 储存订单
    // 结构体 相当于建数据模型
    struct _Order {
        uint256 id;
        address user; // 订单创建的用户
        address tokenGet; // 合约订单的地址
        uint256 amountGet; // 代币数量
        address tokenGive; //
        uint256 amountGive; // 交易的数量
        uint256 timestamp; // 时间戳
    }
    constructor(address _feeAccount, uint256 _feePercent) public {
        feeAccount = _feeAccount;
        feePercent = _feePercent;
    }
    // 回滚
    fallback() external {
        // external 任何地方都可以调用
        revert();
    }
    // 存入以太坊
    function depositEther() public payable {
        //payable  修饰器，认为可支付
        // solidity 允许msg.value
        tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].add(msg.value);
        // 发送事件
        emit Deposit(ETHER, msg.sender, msg.value, tokens[ETHER][msg.sender]);
    }

    // 提取以太坊
    function withdrawEther(uint _amount) public {
        require(tokens[ETHER][msg.sender] >= _amount); //余额必须大于等于提取金额
        tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].sub(_amount);
        payable(msg.sender).transfer(_amount); //在 Solidity 0.8之后，address就不是默认payable类型了。所以要在address前面加上payable的强制类型转换
        emit Withdraw(ETHER, msg.sender, _amount, tokens[ETHER][msg.sender]);
    }

    // 存款token
    function depositToken(address _token, uint256 _amount) public {
        // 哪个token  // how much
        // 不允许 ether 存入
        require(_token != ETHER);
        // 发送token去合约
        require(Token(_token).transferFrom(msg.sender, address(this), _amount)); //this指自身智能合约
        // 跟踪交易所余额 - 更新余额
        tokens[_token][msg.sender] = tokens[_token][msg.sender].add(_amount);
        // 发送事件
        emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    // 提取token
    function withdrawToken(address _token, uint256 _amount) public {
        require(_token != ETHER); // 不允许 ether 提取
        require(tokens[_token][msg.sender] >= _amount); //余额必须大于等于提取金额
        tokens[_token][msg.sender] = tokens[_token][msg.sender].sub(_amount); // 减少用户余额
        require(Token(_token).transfer(msg.sender, _amount)); // 从智能合约提取代币给用户
        emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    // 获取用户余额
    function balanceOf(address _token, address _user) public view returns (uint256) {
        return tokens[_token][_user];
    }

    // 创建订单
    function makeOrder(address _tokenGet, uint256 _amountGet, address _tokenGive, uint256 _amountGive) public {
        orderCount = orderCount.add(1);
        orders[orderCount] = _Order(orderCount, msg.sender, _tokenGet, _amountGet, _tokenGive, _amountGive, block.timestamp);
        emit Order(orderCount, msg.sender, _tokenGet, _amountGet, _tokenGive, _amountGive, block.timestamp);

        // uint id;
        // address user;  // 订单创建的用户
        // address tokenGet;  // 合约订单的地址
        // uint256 amountGet;  // 代币数量
        // address tokenGive;  //
        // uint256 amountGive; // 交易的数量
        // uint256 timestamp; // 时间戳
    }
    // 取消订单
    function cancelOrder(uint256 _id) public {
        //  读取指定ID的订单, 作为变量取出，这里_Order相当于一个变量类型，_order相当于一个变量名称，storage指的是从storage存储器读取
        _Order storage _order = orders[_id];
        //   检查是我的订单
        require(address(_order.user) == msg.sender);
        // 检查有效订单
        require(_order.id == _id);
        // 取消订单
        orderCancel[_id] = true;
        // 取消订单事件
        emit Cancel(_order.id, msg.sender, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive, _order.timestamp);
    }

    function fillOrder(uint256 _id) public {
        // 拉取订单
        _Order storage _order = orders[_id];
        _trade(_order.id, msg.user, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive);
    }
    // internal 内部函数，不能外部调用
    function _trade(uint256 _orderId, address _user, address _tokenGet, uint256 _amountGet, address _tokenGive, uint256 _amountGive) internal {
        // 执行交易

        // 收取费用
        // 发送订单事件
        // 标记订单完成
    }

}
