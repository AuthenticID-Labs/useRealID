import { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { Buffer } from 'buffer';
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';
import ABI from './contracts/MyRegistrar.json';

const CONTRACT_ADDRESS = "0xA0C7Aaf36175B62663a4319EB309Da47A19ec518";

export const useRealID = () =>  {
  const [provider, setProvider] = useState();
  const [merkleRoot, setMerkleRoot] = useState();
  const [address, setAddress] = useState();
  const [chain, setChain] = useState();
  const [leafResults, setLeafResults] = useState([]);
  const [hasRealID, setHasRealID] = useState();
  const [ensName, setEnsName] = useState();
  const [ensAvatar, setEnsAvatar] = useState();

  useEffect(() => {
    (async () => {
      const {ethereum} = window;
      if (!ethereum) return;
  
      const prov = new ethers.providers.Web3Provider(window.ethereum);
      
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const connectedChainId = await ethereum.request({ method: 'eth_chainId' });

      ethereum.on('accountsChanged',  (accounts) => setAddress(accounts[0]));
      ethereum.on('chainChanged', (connectedChain) => setChain(connectedChain));
  
      const registrar = new ethers.Contract(CONTRACT_ADDRESS, ABI.abi, prov);
  
      const root = await registrar.getHash(accounts[0]);
      setMerkleRoot(root);
      console.log('contract merkle root: ', root);
      setEnsName(await prov.lookupAddress(accounts[0]));
      setEnsAvatar(await prov.getAvatar(accounts[0]));
      setProvider(prov);
      setAddress(accounts[0]);
      setChain(connectedChainId);

      return () => {
        ethereum.removeListener('accountsChanged', () => {});
        ethereum.removeListener('chainChanged', () => {});
      }
    })();
  }, [])

  useEffect(() => {
    (async() => {
      if (!provider || !address) {
        setMerkleRoot();
        setLeafResults([]);
        setHasRealID();
        return;
      }

      const result = await provider.resolveName(`${address}.realid.eth`);
      setHasRealID(parseInt(address, 16) === parseInt(result, 16));
      const registrar = new ethers.Contract(CONTRACT_ADDRESS, ABI.abi, provider);
      setEnsName(await provider.lookupAddress(address));
      setEnsAvatar(await provider.getAvatar(address));

      const root = await registrar.getHash(address);
      setMerkleRoot(root);
      console.log('contract merkle root: ', root);
    })();
  }, [address, chain, provider])


  const pastePersonalInfo = useCallback(async () => {
    const clipboardContents = await navigator.clipboard.readText();
    console.log(clipboardContents);
    try {
      window.Buffer = window.Buffer || Buffer;
      const data = JSON.parse(clipboardContents);
      console.log(data.tree);
      const leaves = data.tree.map(leaf => Buffer.from(leaf, 'hex'));
      const myMerkle = new MerkleTree(leaves, keccak256);
      const myRoot = `0x${myMerkle.getRoot().toString('hex')}`;
      console.log('computed root: ', myRoot);

      console.log('merkle root: ', merkleRoot);

      const results = data.leaves.map(leaf => {
        const washedLeaf = keccak256(leaf);
        const proof = myMerkle.getProof(washedLeaf);
        const verification = myMerkle.verify(proof, washedLeaf, merkleRoot);
        return {[leaf]:  verification}
      })

      console.log(results);
      setLeafResults(results);
      
      } catch (error) {
      console.log(error);
    }
  }, [merkleRoot]);

  const connectWallet = useCallback(async () => {
    const {ethereum} = window;

    if (!ethereum) return;

    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    const connectedChainId = await ethereum.request({ method: 'eth_chainId' });
    setAddress(accounts[0]);
    setChain(connectedChainId);

    // String, hex code of the chainId of the Rinkebey test network
    if ("0x4" !== connectedChainId) {
      alert("You are not connected to the correct network!");
      return;
    }
    
    console.log("Connected", accounts[0]);
    const prov = new ethers.providers.Web3Provider(window.ethereum);
    setProvider(prov);

    setEnsName(await prov.lookupAddress(accounts[0]));
    setEnsAvatar(await prov.getAvatar(accounts[0]));
    // confirm RealID holder
    const result = await prov.resolveName(`${accounts[0]}.realid.eth`);
    setHasRealID(parseInt(accounts[0], 16) === parseInt(result, 16));
    console.log(result);
    const registrar = new ethers.Contract(CONTRACT_ADDRESS, ABI.abi, prov);
  
    const root = await registrar.getHash(accounts[0]);
    setMerkleRoot(root);
    console.log('contract merkle root: ', root);
  }, []);


  return {pastePersonalInfo, leafResults, hasRealID, connectWallet, address, ensName, ensAvatar};

}