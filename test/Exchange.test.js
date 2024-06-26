import {tokens, EVM_REVERT, ETHER_ADDRESS, ether} from "./helpers";

const Exchange = artifacts.require("Exchange");
const Token = artifacts.require("Token");
require("chai").use(require("chai-as-promised")).should();
contract("Exchange", ([deployer, feeAccount, user1, user2]) => {
    let exchange;
    let token;
    const feePercent = 10;
    beforeEach(async () => {
        token = await Token.new();
        // 转移token to user1
        token.transfer(user1, tokens(100), {from: deployer});
        // 获取代币
        exchange = await Exchange.new(feeAccount, feePercent);
    });
    // 测试部署
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
    describe("fallback", () => {
        it("reverts when Ether is sent", async () => {
            await exchange.sendTransaction({value: 1, from: user1}).should.be.rejectedWith(EVM_REVERT);
        });
    });
    // 存入Ether
    describe("depositing Ether", () => {
        let result;
        let amount;
        beforeEach(async () => {
            amount = ether(1);
            result = await exchange.depositEther({from: user1, value: amount});
        });
        it("transfer the Ether deposit", async () => {
            const balance = await exchange.tokens(ETHER_ADDRESS, user1);
            balance.toString().should.equal(amount.toString());
        });
        it("emits a Deposit event", async () => {
            const log = result.logs[0];
            log.event.should.eq("Deposit"); // 验证事件名
            // 验证提供者，消费者，批准数量
            const event = log.args;
            event.token
                .toString()
                .should.equal(ETHER_ADDRESS, "token address is correct");
            event.user.toString().should.equal(user1, "token address is correct");
            event.amount
                .toString()
                .should.equal(amount.toString(), "amount is correct");
            event.balance
                .toString()
                .should.equal(amount.toString(), "balance is correct");
        });
    });
    // 提取Ether
    describe("withdrawEther Ether", () => {
        let result;
        let amount;
        beforeEach(async () => {
            amount = ether(1);
            result = await exchange.depositEther({from: user1, value: amount});
        });
        describe("success", () => {
            beforeEach(async () => {
                result = await exchange.withdrawEther(amount, {from: user1});
            });
            it("withdraws Ether funds", async () => {
                const balance = await exchange.tokens(ETHER_ADDRESS, user1);
                balance.toString().should.equal("0"); // 验证余额
            });
            it("emits a 'Withdraw' event", async () => {
                const log = result.logs[0];
                log.event.should.eq("Withdraw"); // 验证事件名
                // 验证提供者，消费者，批准数量
                const event = log.args;
                event.token.should.equal(ETHER_ADDRESS);
                event.user.should.equal(user1);
                event.amount.toString().should.equal(amount.toString());
                event.balance.toString().should.equal("0");
            });
        });
        describe("failure", () => {
            it("rejects withdraws for insufficient balance", async () => {
                // 测试转账 100 ether, 因为我们没有存入 100 ether, 所以此时交易所应该拒绝这笔交易
                await exchange
                    .withdrawEther(ether(1000), {from: user1})
                    .should.be.rejectedWith(EVM_REVERT);
            });
        });
    });

    // 存入代币
    describe("depositing tokens", () => {
        let result;
        let amount;
        describe("success", () => {
            beforeEach(async () => {
                amount = tokens(10);
                // 允许交易所获取代币
                await token.approve(exchange.address, amount, {from: user1});
                // 存款
                result = await exchange.depositToken(token.address, amount, {
                    from: user1,
                });
            });
            it("tracks the token deposit", async () => {
                let balance;
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
                event.token
                    .toString()
                    .should.equal(token.address, "token address is correct");
                event.user.toString().should.equal(user1, "token address is correct");
                event.amount
                    .toString()
                    .should.equal(amount.toString(), "amount is correct");
                event.balance
                    .toString()
                    .should.equal(amount.toString(), "balance is correct");
            });
        });
        describe("failure", () => {
            it("rejects Ether deposits", async () => {
                await exchange
                    .depositToken(ETHER_ADDRESS, amount, {from: user1})
                    .should.be.rejectedWith(EVM_REVERT);
            });
            //  如果并没有任何代币被批准，那么交易所的转账就是失败的
            it("fails when on tokens are approved", async () => {
                await exchange
                    .depositToken(token.address, amount, {from: user1})
                    .should.be.rejectedWith(EVM_REVERT);
            });
        });
    });
    // 提取token
    describe("withdrawEther tokens", () => {
        let result;
        let amount;
        describe("success", () => {
            beforeEach(async () => {
                amount = tokens(10);
                // 允许交易所获取代币
                await token.approve(exchange.address, amount, {from: user1}); // 交易所批准
                await exchange.depositToken(token.address, amount, {from: user1}); // 存入token
                result = await exchange.withdrawToken(token.address, amount, {
                    from: user1,
                }); //提取token
            });
            it("withdraws token funds", async () => {
                const balance = await exchange.tokens(token.address, user1);
                balance.toString().should.equal("0");
            });
            it("emits a 'Withdraw' event", () => {
                const log = result.logs[0];
                log.event.should.eq("Withdraw"); // 验证事件名
                // 验证提供者，消费者，批准数量
                const event = log.args;
                event.token.should.equal(token.address);
                event.user.should.equal(user1);
                event.amount.toString().should.equal(amount.toString());
                event.balance.toString().should.equal("0");
            });
        });
        describe("failure", () => {
            it("rejects Ether withdraws", async () => {
                await exchange
                    .withdrawToken(ETHER_ADDRESS, amount, {from: user1})
                    .should.be.rejectedWith(EVM_REVERT);
            });
            it("fails for insufficient balances", async () => {
                await exchange
                    .withdrawToken(token.address, amount, {from: user1})
                    .should.be.rejectedWith(EVM_REVERT);
            });
        });
    });
    // 余额检查
    describe("checking balances", () => {
        beforeEach(async () => {
            exchange.depositEther({from: user1, value: ether(1)}); //存入以太坊
        });
        it("returns user balance", async () => {
            const result = await exchange.balanceOf(ETHER_ADDRESS, user1);
            result.toString().should.equal(ether(0).toString());
        });
    });

    // 订单创建
    describe("making orders", () => {
        let result;
        beforeEach(async () => {
            result = await exchange.makeOrder(
                token.address,
                tokens(1),
                ETHER_ADDRESS,
                ether(1),
                {from: user1}
            );
        });
        it("tracks the newly created order", async () => {
            const orderCount = await exchange.orderCount();
            orderCount.toString().should.equal("1");
            // 订单参数检查
            const order = await exchange.orders("1"); // 取出 id 为 1 的订单
            order.id.toString().should.equal("1", "id is correct");
            order.user.should.equal(user1, "user is correct");
            order.tokenGet.should.equal(token.address, "tokenGet is correct");
            order.amountGet
                .toString()
                .should.equal(tokens(1).toString(), "amountGet is correct");
            order.tokenGive.should.equal(ETHER_ADDRESS, "tokenGive is correct");
            order.amountGive
                .toString()
                .should.equal(ether(1).toString(), "amountGive is correct");
            order.timestamp
                .toString()
                .length.should.be.at.least(1, "timestamp is present");
        });
        // 订单事件检查
        it('emits an "Order" event', async () => {
            const log = result.logs[0];
            log.event.should.eq("Order");
            const event = log.args;
            event.id.toString().should.equal("1", "id is correct");
            event.user.should.equal(user1, "user is correct");
            event.tokenGet.should.equal(token.address, "tokenGet is correct");
            event.amountGet
                .toString()
                .should.equal(tokens(1).toString(), "amountGet is correct");
            event.tokenGive.should.equal(ETHER_ADDRESS, "tokenGive is correct");
            event.amountGive
                .toString()
                .should.equal(ether(1).toString(), "amountGive is correct");
            event.timestamp
                .toString()
                .length.should.be.at.least(1, "timestamp is present");
        });
    });

    describe("order actions", () => {
        beforeEach(async () => {
            // user1 deposits ether. user1 存款 1 ether
            await exchange.depositEther({from: user1, value: ether(1)});
            // deployer give token to user2. deployer 给 user2 发 100 tokens
            await token.transfer(user2, tokens(100), {from: deployer});
            // user2 deposits tokens only. user2 只收 2 tokens (?), 并将对 2 tokens 进行存款
            await token.approve(exchange.address, tokens(2), {from: user2});
            await exchange.depositToken(token.address, tokens(2), {from: user2});
            // user 1 makes an order to buy tokens with Ether. user1 创建订单, 即 user1 是 “_user”, 订单中 token=1, ether=1
            await exchange.makeOrder(token.address, tokens(1), ETHER_ADDRESS, ether(1), {from: user1});
        });

        describe("filling orders", () => {
            let result;
            describe("success", async () => {
                beforeEach(async () => {
                    // user2 fills order. user2 填写订单, 即 user2 是 “msg.sender”. 他将会接收到 1 token 和 1 ether
                    result = await exchange.fillOrder(1, {from: user2});
                });
                it("executes the trade & charges fees", async () => {
                    let balance;
                    balance = await exchange.balanceOf(token.address, user1); // 获取 user1 的 token 余额
                    balance.toString().should.equal(tokens(1).toString(), "user1 received tokens");
                    balance = await exchange.balanceOf(ETHER_ADDRESS, user2); // 获取 user2 的 ether 余额
                    balance.toString().should.equal(ether(1).toString(), "user2 received Ether");
                    balance = await exchange.balanceOf(ETHER_ADDRESS, user1); // 获取 user1 的 ether 余额
                    balance.toString().should.equal(0, "user1 Ether deducted");
                    balance = await exchange.balanceOf(token.address, user2); // 获取 user2 的 token 余额(扣除了小费)
                    balance.toString().should.equal(tokens(0.9).toString(), "user2 tokens deducted with fee applied");
                    const feeAccount = await exchange.feeAccount();
                    balance = await exchange.balanceOf(token.address, feeAccount);
                    balance.toString().should.equal(tokens(0.1).toString(), "feeAccount received fee");
                });
                it("updates filled orders", async () => {
                    const orderFilled = await exchange.orderFilled(1);
                    orderFilled.should.equal(true);
                });
                it('emits a "Trade" event', async () => {
                    const log = result.logs[0];
                    log.event.should.eq("Trade");
                    const event = log.args;
                    event.id.toString().should.equal("1", "id is correct");
                    event.user.should.equal(user1, "user is correct");
                    event.tokenGet.should.equal(token.address, "tokenGet is correct");
                    event.amountGet.toString().should.equal(tokens(1).toString(), "amountGet is correct");
                    event.tokenGive.should.equal(ETHER_ADDRESS, "tokenGive is correct");
                    event.amountGive.toString().should.equal(ether(1).toString(), "amountGive is correct");
                    event.userFill.should.equal(user2, "userFill is correct");
                    event.timestamp.toString().length.should.be.at.least(1, "timestamp is present");
                });
            });

            describe("failure", () => {
                it("rejects invalid order ids", async () => {
                    const invalidOrderId = 99999;
                    await exchange.fillOrder(invalidOrderId, {from: user2}).should.be.rejectedWith(EVM_REVERT);
                });
                it("rejects already-filled orders", async () => {
                    // Fill the order
                    await exchange.fillOrder(1, {from: user2}).should.be.fulfilled;
                    // Try to fill it again
                    await exchange.fillOrder(1, {from: user2}).should.be.rejectedWith(EVM_REVERT);
                });
                it("rejects cancelled orders", async () => {
                    // Cancel the order
                    await exchange.cancelOrder(1, {from: user1}).should.be.fulfilled;
                    // Try to fill the order
                    await exchange.fillOrder(1, {from: user2}).should.be.rejectedWith(EVM_REVERT);
                });
            });
        });
        describe("cancelling orders", () => {
            let result;
            describe("success", () => {
                beforeEach(async () => {
                    result = await exchange.cancelOrder('1', {from: user1});
                });
                it("updates cancelled orders", async () => {
                    const orderCancelled = await exchange.cancelOrder(1);
                    orderCancelled.should.equal(true);
                });
                it('emits an "Cancel" event', async () => {
                    const log = result.logs[0];
                    log.event.should.eq("Cancel");
                    const event = log.args;
                    event.id.toString().should.equal("1", "id is correct");
                    event.user.should.equal(user1, "user is correct");
                    event.tokenGet.should.equal(token.address, "tokenGet is correct");
                    event.amountGet.toString().should.equal(tokens(1).toString(), "amountGet is correct");
                    event.tokenGive.should.equal(ETHER_ADDRESS, "tokenGive is correct");
                    event.amountGive.toString().should.equal(ether(1).toString(), "amountGive is correct");
                    event.timestamp.toString().length.should.be.at.least(1, "timestamp is present");
                });
            });

            describe("failure", () => {
                it("rejects invalid order ids", async () => {
                    const invalidOrderId = 99999;
                    await exchange.cancelOrder(invalidOrderId, {from: user1}).should.be.rejectedWith(EVM_REVERT);
                });
                it("rejects unauthorized cancellations", async () => {
                    // Try to cancel the order from another user
                    await exchange.cancelOrder(1, {from: user2}).should.be.rejectedWith(EVM_REVERT);
                });
            });
        });
    });
});
