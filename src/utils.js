const addressToHex = (address) => {
    const hexString = '0x' + address.slice(2).toLowerCase().padStart(64, '0');
    return hexString.toLowerCase();
}

const convertAmountDecimals = (amount, decimals) => {
    return amount * Math.pow(10, 18 - decimals);
}

module.exports = {
    addressToHex,
    convertAmountDecimals
}