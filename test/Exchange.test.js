const Exchange = artifacts.require("Exchange");
const Token = artifacts.require("Token");
import {tokens, EVM_REVERT, ETHER_ADDRESS, ether} from "./helpers";

require("chai").use(require("chai-as-promised")).should();


contract("Exchange", ([deployer, feeAccount, user1]) => {
    let exchange;
    let token;
    const feePercent = 10;
    beforeEach(async () => {
        token = await Token.new();
        // 转移token to user1
        token.transfer(user1, tokens(100), {from: deployer})
        // 获取代币
        exchange = await Exchange.new(feeAccount, feePercent);

    });
    describe("deployment", () => {
        it("tracks the fee account", async () => {
            const result = await exchange.feeAccount();
            result.should.equal(feeAccount);
        });
        it("tracks the fee percent", async () => {
            const result = await exchange.feePercent();
            result.toString().should.equal(feePercent.toString());
        });
    });

    //撤销发送事件
    describe('fallback', () => {
        it('reverts when Ether is sent', async() => {
            await exchange.sendTransaction({value:1,from:user1}).should.be.rejectedWith(EVM_REVERT)
        });
    });

    describe("depositing Ether", () => {
        let result;
        let amount;
        beforeEach(async () => {
            amount = ether(1);
            result = await exchange.depositEther({from: user1, value: amount});
        });
        it('transfer the Ether deposit', async () => {
            const balance = await exchange.tokens(ETHER_ADDRESS, user1);
            balance.toString().should.equal(amount.toString());
        });
        it("emits a Deposit event", async () => {
            const log = result.logs[0];
            log.event.should.eq("Deposit"); // 验证事件名
            // 验证提供者，消费者，批准数量
            const event = log.args;
            event.token.toString().should.equal(ETHER_ADDRESS, "token address is correct");
            event.user.toString().should.equal(user1, "token address is correct");
            event.amount.toString().should.equal(amount.toString(), "amount is correct");
            event.balance.toString().should.equal(amount.toString(), "balance is correct");
        });
    });

    describe("depositing tokens", () => {
        let result;
        let amount;
        describe("success", () => {
            beforeEach(async () => {
                amount = tokens(10);
                // 允许交易所获取代币
                await token.approve(exchange.address, amount, {from: user1});
                // 存款
                result = await exchange.depositToken(token.address, amount, {from: user1});
            });
            it("tracks the token deposit", async () => {
                let balance
                balance = await token.balanceOf(exchange.address);
                balance.toString().should.equal(amount.toString());
                // 检查交易所的token余额
                balance = await exchange.tokens(token.address, user1);
                balance.toString().should.equal(amount.toString());
            });

            it("emits a Deposit event", async () => {
                const log = result.logs[0];
                log.event.should.eq("Deposit"); // 验证事件名
                // 验证提供者，消费者，批准数量
                const event = log.args;
                event.token.toString().should.equal(token.address, "token address is correct");
                event.user.toString().should.equal(user1, "token address is correct");
                event.amount.toString().should.equal(amount.toString(), "amount is correct");
                event.balance.toString().should.equal(amount.toString(), "balance is correct");
            });
        });
        describe("failure", () => {
            it('rejects Ether deposits', async () => {
                await exchange.depositToken(ETHER_ADDRESS, amount, {from: user1}).should.be.rejectedWith(EVM_REVERT)
            });
            //  如果并没有任何代币被批准，那么交易所的转账就是失败的
            it('fails there on tokens arr approved', async () => {
                await exchange.depositToken(token.address, amount, {from: user1}).should.be.rejectedWith(EVM_REVERT)
            });
        });
    });
});
