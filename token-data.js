function random_hash() {
  let x = "0123456789abcdef", hash = '0x'
  for (let i = 64; i > 0; --i) {
    hash += x[Math.floor(Math.random() * x.length)]
  }
  return hash;
};

if (!this.tokenData) this.tokenData = {};
//INSERT_USER_TOKEN_DATA//
if (!('tokenId' in tokenData)) tokenData.tokenId = "123000456";
if (!('hash' in tokenData)) tokenData.hash = random_hash();