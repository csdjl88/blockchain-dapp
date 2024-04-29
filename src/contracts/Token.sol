// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "openzeppelin-solidity/contracts/utils/math/SafeMath.sol";

contract Token {
    // 使用SafeMath进行计算
    using SafeMath for uint;
    string public name = "DApp Token";
    string public symbol = "DAPP";
    uint256 public decimals = 18; //以太坊的小数位可以被18位
    uint256 public totalSupply;

    // 跟踪余额
    // track balances 获取余额
    // mapping 映射关联键值对 address账户地址 uint256余额单位，1字节等于8个比特，而32指的就是32个字节，即8*32=256比特
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance; //双重映射 allowance交易所批准的金额，转移的金额数量

    // Events
    // 转移事件，
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // 总的供应量 = 代币 * (10 ** decimals)
    constructor() public {
        totalSupply = 1000000 * (10 ** decimals);
        // 余额的发送，sender就是部署智能合约的人
        balanceOf[msg.sender] = totalSupply;
    }

    // 转移
    function transfer(address _to, uint256 _value) public returns (bool success) {
        require(balanceOf[msg.sender] >= _value); // require 为 true 执行下面，false 不执行 判断是否有足够的余额进行转移
        _transfer(msg.sender, _to, _value);
        return true;
    }

    // 覆写 transfer抽取公共方法
    //_开头的内部函数 internal 关键字为内部函数的关键字，
    function _transfer(address _from, address _to, uint256 _value) internal {
        require(_to != address(0));
        // 转移者的余额 = 余额 - _value
        // 接受者的余额 = 余额 + _value
        balanceOf[_from] = balanceOf[_from].sub(_value); // 从一个账户上减少余额
        balanceOf[_to] = balanceOf[_to].add(_value); // 接收方增加余额
        // 触发订阅的事件
        emit Transfer(_from, _to, _value);
    }

    // approve tokens
    // 批准函数
    function approve(address _spender, uint256 _value) public returns (bool success) {
        require(_spender != address(0));
        allowance[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }
    // `transfer` 用于直接的地址间转移，
    // 而 `transferFrom` 用于授权操作者代表拥有者进行转移。在调用 `transferFrom` 之前，通常需要拥有者通过调用 `approve` 函数提前授权。
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success){
        // 添加函数限制条件
        require(_value <= balanceOf[_from]); // 批准的数量 <= 来源者的资金
        require(_value <= allowance[_from][msg.sender]); // 批准的数量 <= 交易所的余额
        // 余额 = 余额 - _value
        allowance[_from][msg.sender] = allowance[_from][msg.sender].sub(_value);
        _transfer(_from, _to, _value);
        return true;
    }
}
