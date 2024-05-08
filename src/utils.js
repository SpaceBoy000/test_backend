const addressToHex = (address) => {
    const hexString = '0x' + address.slice(2).toLowerCase().padStart(64, '0');
    return hexString.toLowerCase();
}

module.exports = {
    addressToHex
}