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
// [] 创建订单
// [] 取消订单
// [] 填充订单

// 交易所
contract Exchange {
    using SafeMath for uint;
    address public feeAccount; //接收交易费用的账户
    uint256 public feePercent; // 交易费率
    address constant ETHER = address(0); //constant 常量  默认0为以太坊地址
    // 第一个地址：token地址，第二个地址：存入代币的用户地址
    mapping(address => mapping(address => uint256)) public tokens; // 代币 => (实际用户地址 => 用户持有的代币数量)

    mapping(uint256 => _Order) public orders; // uint256相当于ID
    // 存款事件
    event Deposit(address token, address user, uint256 amount, uint256 balance);
    // 提款事件
    event Withdraw(
        address token,
        address user,
        uint256 amount,
        uint256 balance
    );
    // TODO:
    // [X] 建立一个订单model
    // [x] mapping 储存订单的方法
    // [] 储存订单
    // 结构体 相当于建数据模型
    struct _Order {
        uint id;
        address user;  // 订单创建的用户
        address tokenGet;  // 合约订单的地址
        uint256 amountGet;  // 代币数量
        address tokenGive;  //
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
        _id = 1;
    }


}
