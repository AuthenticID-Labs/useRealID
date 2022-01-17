## useRealID

#### Installation

```
npm i @authenticid-labs/userealid
```
or
```
yarn add @authenticid-labs/userealid
```

#### Usage

```
const {connectWallet, ensName, ensAvatar, address, hasRealID, pastePersonalInfo} = useRealID();
```

  

| Value | Type | Description |
| :--- | :----: | ---: |
| connectWallet | function | Connect wallet and get ENS address |
| ensName | string or undefined | ENS name |
| ensAvatar | string or undefined | ENS avatar URI |
| address | string or undefined | ETH wallet address |
| hasRealID | boolean | true if address has Real ID |
| pastePersonalInfo | function | Accepts and verifies shared personal data |