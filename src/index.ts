import { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { Buffer } from 'buffer';
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';
import * as ABI from './contracts/MyRegistrar.json';

const CONTRACT_ADDRESS = "0xA0C7Aaf36175B62663a4319EB309Da47A19ec518";

export const useRealID = () =>  {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | undefined>();
  const [merkleRoot, setMerkleRoot] = useState<string | undefined>();
  const [address, setAddress] = useState<string | undefined>();
  const [chain, setChain] = useState<string | undefined>();
  const [leafResults, setLeafResults] = useState<string[]>([]);
  const [hasRealID, setHasRealID] = useState<boolean>();
  const [ensName, setEnsName] = useState<string | null>();
  const [ensAvatar, setEnsAvatar] = useState<string | null>();

  useEffect(() => {
    (async () => {
      // @ts-ignore
      const {ethereum} = window;
      if (!ethereum) return;
  
      const prov = new ethers.providers.Web3Provider(ethereum);
      
      const accounts: string[] = await ethereum.request({ method: "eth_requestAccounts" });
      const connectedChainId = await ethereum.request({ method: 'eth_chainId' });

      ethereum.on('accountsChanged',  (accts: string[]) => setAddress(accts[0]));
      ethereum.on('chainChanged', (connectedChain: string) => setChain(connectedChain));
  
      const registrar = new ethers.Contract(CONTRACT_ADDRESS, ABI.abi, prov);
  
      const root = await registrar.getHash(accounts[0]);
      setMerkleRoot(root);
      setEnsName(await prov.lookupAddress(accounts[0]));
      setEnsAvatar(await prov.getAvatar(accounts[0]));
      setProvider(prov);
      setAddress(accounts[0]);
      setChain(connectedChainId);

      return () => {
        ethereum.removeListener('accountsChanged', null);
        ethereum.removeListener('chainChanged', null);
      }
    })();
  }, [])

  useEffect(() => {
    (async() => {
      if (!provider || !address) {
        setMerkleRoot(undefined);
        setLeafResults([]);
        setHasRealID(undefined);
        return;
      }

      const result = await provider.resolveName(`${address}.realid.eth`);
      setHasRealID(!!result ? parseInt(address, 16) === parseInt(result, 16) : false);
      const registrar = new ethers.Contract(CONTRACT_ADDRESS, ABI.abi, provider);
      setEnsName(await provider.lookupAddress(address));
      setEnsAvatar(await provider.getAvatar(address));

      const root = await registrar.getHash(address);
      setMerkleRoot(root);
    })();
  }, [address, chain, provider])


  const pastePersonalInfo = useCallback(async () => {
    if (!merkleRoot) return;
    // @ts-ignore
    const clipboardContents = await navigator.clipboard.readText();
    try {
    // @ts-ignore
    window.Buffer = window.Buffer || Buffer;
      const data = JSON.parse(clipboardContents);
      const leaves = data.tree.map((leaf: string) => Buffer.from(leaf, 'hex'));
      const myMerkle = new MerkleTree(leaves, keccak256);
      const myRoot = `0x${myMerkle.getRoot().toString('hex')}`;

      const results = data.leaves.map((leaf: string) => {
        const washedLeaf = keccak256(leaf);
        const proof = myMerkle.getProof(washedLeaf);
        const verification = myMerkle.verify(proof, washedLeaf, merkleRoot);
        return {[leaf]:  verification}
      })

      setLeafResults(results);
      
    } catch (error) {
      console.error(error);
    }
  }, [merkleRoot]);

  const connectWallet = useCallback(async () => {
    // @ts-ignore
    const {ethereum} = window;

    if (!ethereum) return;

    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    const connectedChainId = await ethereum.request({ method: 'eth_chainId' });
    setAddress(accounts[0]);
    setChain(connectedChainId);

    // String, hex code of the chainId of the Rinkebey test network
    if ("0x4" !== connectedChainId) {
//      TODO - add error message for wrong chain
      return;
    }
    
    const prov = new ethers.providers.Web3Provider(ethereum);
    setProvider(prov);

    setEnsName(await prov.lookupAddress(accounts[0]));
    setEnsAvatar(await prov.getAvatar(accounts[0]));
    // confirm RealID holder
    const result = await prov.resolveName(`${accounts[0]}.realid.eth`);
    setHasRealID(!!result ? parseInt(accounts[0], 16) === parseInt(result, 16) : false);
    const registrar = new ethers.Contract(CONTRACT_ADDRESS, ABI.abi, prov);
  
    const root = await registrar.getHash(accounts[0]);
    setMerkleRoot(root);
  }, []);


  return {pastePersonalInfo, leafResults, hasRealID, connectWallet, address, ensName, ensAvatar};

}