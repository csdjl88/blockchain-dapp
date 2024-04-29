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
// [] 提取 ether
// [X] 存入 token
// [] 提取 token
// [] 余额检查
// [] 创建订单
// [] 取消订单
// [] 填充订单

// 交易所
contract Exchange {
    using SafeMath for uint;
    address public feeAccount;  //接收交易费用的账户
    uint256 public feePercent; // 交易费率
    address constant ETHER = address(0); //constant 常量  默认0为以太坊地址
    // 第一个地址：token地址，第二个地址：存入代币的用户地址
    mapping(address => mapping(address => uint256)) public tokens;

    // event
    event Deposit(address token, address user, uint256 amount, uint256 balance);

    constructor(address _feeAccount, uint256 _feePercent) public {
        feeAccount = _feeAccount;
        feePercent = _feePercent;
    }
    // 回滚
    fallback()  external {
        revert();
    }

    // 存入以太坊
    function depositEther() payable public {  //payable  修改器方法，认为可支付
        tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].add(msg.value);
        // 发送事件
        emit Deposit(ETHER, msg.sender, msg.value, tokens[ETHER][msg.sender]);
    }

    // 存款
    function depositToken(address _token, uint256 _amount) public {    // 哪个token  // how much
        // 不允许 ether 存入
        require(_token != ETHER);
        // 发送token去合约
        require(Token(_token).transferFrom(msg.sender, address(this), _amount));  //this指自身智能合约
        // 跟踪交易所余额 - 更新余额
        tokens[_token][msg.sender] = tokens[_token][msg.sender].add(_amount);
        // 发送事件
        emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);

    }
}
