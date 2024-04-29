const Token = artifacts.require("Token");
import {tokens, EVM_REVERT} from "./helpers";

require("chai").use(require("chai-as-promised")).should();

// 测试文件的描述需要进行合理的嵌套，方便阅读信息
contract("Token", ([deployer, receiver, exchange]) => {
    const name = "DApp Token";
    const symbol = "DAPP";
    const decimals = "18";
    const totalSupply = tokens(1000000).toString();
    let token;
    beforeEach(async () => {
        // 获取代币
        token = await Token.new();
    });
    describe("deployment", () => {
        it("tracks the name", async () => {
            const result = await token.name();
            result.should.equal(name);
        });
        it("tracks the symbol", async () => {
            const result = await token.symbol();
            result.should.equal(symbol);
        });
        it("tracks the decimals", async () => {
            const result = await token.decimals();
            result.toString().should.equal(decimals);
        });
        it("tracks the total supply", async () => {
            const result = await token.totalSupply();
            result.toString().should.equal(totalSupply.toString());
        });

        it("assigns the total supply to the deployer", async () => {
            const result = await token.balanceOf(deployer);
            result.toString().should.equal(totalSupply.toString());
        });
    });
    // 发送代币的单元测试
    describe("sending tokens", () => {
        let result;
        let amount;

        // 转移成功的单元测试
        describe("success", () => {
            beforeEach(async () => {
                amount = tokens(100);
                // 等待执行转移函数
                result = await token.transfer(receiver, amount, {from: deployer});
            });

            // 发送代币需要注意验证的点，转移前分别的余额，执行转移，转移后分别的余额
            it("transfers token balances", async () => {
                let balanceOf;
                // 转移之前
                balanceOf = await token.balanceOf(deployer);
                balanceOf.toString().should.equal(tokens(999900).toString());
                //  转移以后
                balanceOf = await token.balanceOf(receiver);
                balanceOf.toString().should.equal(tokens(100).toString());
            });
            // 触发转移事件的单元测试
            it("emits a Transfer event", async () => {
                const log = result.logs[0];
                log.event.should.eq("Transfer");
                const event = log.args;
                event.from.toString().should.equal(deployer, "from is correct");
                event.to.toString().should.equal(receiver, "to is correct");
                event.value.toString().should.equal(amount.toString(), "value is correct");
            });
        });
        // 转移失败的单元测试
        describe("failure", () => {
            // 当余额不足
            it("rejects insufficient balances", async () => {
                let invalidAmount;
                //  发生转移的金额不得大于流通总额
                //当转移的数量 > 代币总量的时候 --- 结果是要被拒绝
                invalidAmount = tokens(100000000); // 100 million - greater than total supply
                await token.transfer(receiver, invalidAmount, {from: deployer}).should.be.rejectedWith(EVM_REVERT);
                // 当你没有token时尝试转移token
                invalidAmount = tokens(10); // Attempt transfer tokens, when you have none
                await token.transfer(deployer, invalidAmount, {from: receiver}).should.be.rejectedWith(EVM_REVERT);

                // 检查接收方有效性
                it("rejects invalid recipients", async () => {
                    await token.transfer(0x0, amount, {from: deployer}).should.be.rejected;
                });
            });
        });
    });
    //允许别人使用token
    describe("approving tokens", () => {
        let result;
        let amount;
        beforeEach(async () => {
            amount = tokens(100);
            result = await token.approve(exchange, amount, {from: deployer});
        });

        describe("success", () => {
            // 余额验证
            it("allocates an allowance for delegated token spending on exchange", async () => {
                const allowance = await token.allowance(deployer, exchange);
                allowance.toString().should.equal(amount.toString());
            });
            // 事件触发
            it("emits an Approval  event", async () => {
                const log = result.logs[0];
                log.event.should.eq("Approval"); // 验证事件名
                // 验证提供者，消费者，批准数量
                const event = log.args;
                event.owner.toString().should.equal(deployer, "owner is correct");
                event.spender.toString().should.equal(exchange, "spender is correct");
                event.value.toString().should.equal(amount.toString(), "value is correct");
            });
        });

        describe("failure", () => {
            it("rejects invalid recipients", async () => {
                await token.transfer(0x0, amount, {from: deployer}).should.be.rejected;
            });
        });
    });
    // 发送代币的单元测试
    describe("delegated tokens transfers", () => {
        let result;
        let amount;

        beforeEach(async () => {
            amount = tokens(100);
            // 等待执行批准,也就是在代币转移之前，是需要先从发布者那里批准代币到交易所
            await token.approve(exchange, amount, {from: deployer});
        });

        describe("success", () => {
            beforeEach(async () => {
                // 等待执行转移函数
                result = await token.transferFrom(deployer, receiver, amount, {from: exchange})
            });

            it("transfers token balances", async () => {
                let balanceOf;
                // 转移之前
                balanceOf = await token.balanceOf(deployer);
                balanceOf.toString().should.equal(tokens(999900).toString());
                //  转移以后
                balanceOf = await token.balanceOf(receiver);
                balanceOf.toString().should.equal(tokens(100).toString());
            });
            it("resets the allowance", async () => {
                const allowance = await token.allowance(deployer, exchange);
                allowance.toString().should.equal("0");
            });
            it("emits a Transfer event", async () => {
                const log = result.logs[0];
                log.event.should.eq("Transfer");
                const event = log.args;
                event.from.toString().should.equal(deployer, "from is correct");
                event.to.toString().should.equal(receiver, "to is correct");
                event.value.toString().should.equal(amount.toString(), "value is correct");
            });
        });

        describe("failure", () => {
            it("rejects insufficient balances", async () => {
                let invalidAmount;
                //当转移的数量 > 代币总量的时候 --- 结果是要被拒绝
                invalidAmount = tokens(100000000); // 100 million - greater than total supply
                await token.transfer(receiver, invalidAmount, {from: deployer}).should.be.rejectedWith(EVM_REVERT);

                // Attempt transfer tokens, when you have none
                invalidAmount = tokens(10);
                await token.transfer(deployer, invalidAmount, {from: receiver}).should.be.rejectedWith(EVM_REVERT);
            });
            it("rejects invalid recipients", async () => {
                // 当地址错误，也就是无效的接受者
                await token.transfer(0x0, amount, {from: deployer}).should.be.rejected;
            });
        });
    });
});
