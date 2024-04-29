export const EVM_REVERT = 'VM Exception while processing transaction: revert'
// Ether地址
export const ETHER_ADDRESS = '0x0000000000000000000000000000000000000000'
/**
 *
 * @param {*} n
 * @returns
 *
 * web3.utils.toWei()将给定的以太金额转换为以wei为单位的数值。
 * wei是最小的以太单位，应当总是使用wei进行计算，仅在需要显示时进行转换
 * web3.utils.toWei(number [, unit])
 *
 *
 * web3.utils.BN(mixed) [mixed - String|Number: 数值字符串或16进制字符串]
 *
 * 1ether = 1000000000000000000    1后面+18个0（念一兆亿）
 */
export const ether = (n)=>{
    return new web3.utils.BN(
        web3.utils.toWei(n.toString(),'ether')
    )
}
export const tokens = (n) => ether(n)