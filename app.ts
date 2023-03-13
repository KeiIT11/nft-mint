import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Metaplex, keypairIdentity, bundlrStorage, toMetaplexFile, toBigNumber } from "@metaplex-foundation/js";
import * as fs from 'fs';
import secretkey from './guideSecret.json';

const QUICKNODE_RPC = 'https://prettiest-responsive-tab.solana-devnet.discover.quiknode.pro/e5f0d0986c45abd81f4ef1d318c96a7fdabcca8a/';
const SOLANA_CONNECTION = new Connection(QUICKNODE_RPC);
const WALLET = Keypair.fromSecretKey(new Uint8Array(secretkey));
const METAPLEX = Metaplex.make(SOLANA_CONNECTION)
    .use(keypairIdentity(WALLET))
    .use(bundlrStorage({
        address: 'https://devnet.bundlr.network',
        providerUrl: QUICKNODE_RPC,
        timeout: 60000,
    }));

const CONFIG = {
    uploadPath: 'uploads/',
    imgFileName: 'image.png',
    imgType: 'image/png',
    imgName: 'QuickNode Pixel',
    description: 'Pixel infrastructure for everyone!',
    attributes: [
        {trait_type: 'Speed', value: 'Quick'},
        {trait_type: 'Type', value: 'Pixelated'},
        {trait_type: 'Background', value: 'QuickNode Blue'}
    ],
    sellerFeeBasisPoints: 500,//500 bp = 5%
    symbol: 'QNPIX',
    creators: [
        {address: WALLET.publicKey, share: 100}
    ]
};
    

async function uploadImage(filePath: string,fileName: string): Promise<string> {
    console.log(`Step 1 - Uploading Image`);
    const imgBuffer = fs.readFileSync(filePath+fileName);
    const imgMetaplexFile = toMetaplexFile(imgBuffer,fileName);
    const imgUri = await METAPLEX.storage().upload(imgMetaplexFile);
    console.log(`   Image URI:`,imgUri);
    return imgUri;
}

async function uploadMetadata(imgUri: string, imgType: string, nftName: string, description: string, attributes: {trait_type: string, value: string}[]) {
    console.log(`Step 2 - Uploading Metadata`);
    const { uri } = await METAPLEX
    .nfts()
    .uploadMetadata({
        name: nftName,
        description: description,
        image: imgUri,
        attributes: attributes,
        properties: {
            files: [
                {
                    type: imgType,
                    uri: imgUri,
                },
            ]
        }
    });
    console.log('   Metadata URI:',uri);
    return uri;    
}

async function mintNft(metadataUri: string, name: string, sellerFee: number, symbol: string, creators: {address: PublicKey, share: number}[]) {
    console.log(`Step 3 - Minting NFT`);
    const { nft } = await METAPLEX
    .nfts()
    .create({
        uri: metadataUri,
        name: name,
        sellerFeeBasisPoints: sellerFee,
        symbol: symbol,
        creators: creators,
        isMutable: false,
        maxSupply: toBigNumber(1)
    },
    { commitment: "finalized" }
    );
    console.log(`   Success!🎉`);
    console.log(`   Minted NFT: https://explorer.solana.com/address/${nft.address}?cluster=devnet`);
}

async function main() {
    console.log(`Minting ${CONFIG.imgName} to an NFT in Wallet ${WALLET.publicKey.toBase58()}`);
    //Step 1 - Upload Image
    const imgUri = await uploadImage(CONFIG.uploadPath,CONFIG.imgFileName);
    //Step 2 - Upload Metadata
    //const metadataUri = await uploadMetadata("https://plus.unsplash.com/premium_photo-1672264150574-4761d2dc3e26?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxfDB8MXxyYW5kb218MHx8fHx8fHx8MTY3ODcxNzk3Nw&ixlib=rb-4.0.3&q=80&w=1080",CONFIG.imgType,CONFIG.imgName, CONFIG.description, CONFIG.attributes); 
    const metadataUri = await uploadMetadata(imgUri,CONFIG.imgType,CONFIG.imgName, CONFIG.description, CONFIG.attributes);
    //Step 3 - Mint NFT
    mintNft(metadataUri,CONFIG.imgName,CONFIG.sellerFeeBasisPoints,CONFIG.symbol,CONFIG.creators);
}

main();