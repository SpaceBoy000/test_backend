const formidable = require('formidable');
const fs = require('fs');

const {
    Metaplex,
    keypairIdentity,
    bundlrStorage,
    toMetaplexFile,
} = require("@metaplex-foundation/js");
const {
    DataV2,
    createCreateMetadataAccountV3Instruction,
    createUpdateMetadataAccountV2Instruction,
    PROGRAM_ID,
} = require("@metaplex-foundation/mpl-token-metadata");

const {
    Connection,
    SystemProgram,
    clusterApiUrl,
    Keypair,
    Transaction,
    sendAndConfirmTransaction,
    PublicKey,
    Cluster,
} = require("@solana/web3.js");
const {
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createMint,
    getMinimumBalanceForRentExemptMint,
    getAssociatedTokenAddress,
    MINT_SIZE,
    createInitializeMintInstruction,
    createAssociatedTokenAccountInstruction,
    createMintToInstruction,
    createInitializeMintCloseAuthorityInstruction,
    createInitializeTransferFeeConfigInstruction,
    getMintLen,
    ExtensionType,
    TOKEN_2022_PROGRAM_ID,
    createSetAuthorityInstruction,
} = require("@solana/spl-token");

const Constants = require("../../constants");

let networkUrl = clusterApiUrl(Constants.NETWORK);
console.log(networkUrl);
let connection = new Connection(networkUrl, "confirmed");

const user = Keypair.fromSecretKey(Uint8Array.from(Constants.PRIVATE_KEY));
const payer = user;
let mintAuthority = user.publicKey;
let freezeAuthority = user.publicKey;
let updateAuthority = user.publicKey;
let owner = user.publicKey;

let mintKey;

const createToken = async () => {
    let mintKeypair = Keypair.generate();
    mintKey = mintKeypair.publicKey;

    // Create Token
    const requiredBalance = await getMinimumBalanceForRentExemptMint(connection);
    const tokenATA = await getAssociatedTokenAddress(mintKey, owner);

    const createTokenTx = new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: mintKey,
            space: MINT_SIZE,
            lamports: requiredBalance,
            programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
            mintKey,
            Constants.TOKEM_DECIMAL,
            mintAuthority,
            freezeAuthority,
            TOKEN_PROGRAM_ID
        ),
        createAssociatedTokenAccountInstruction(
            payer.publicKey,
            tokenATA,
            owner,
            mintKey
        ),
        createMintToInstruction(
            mintKey,
            tokenATA,
            mintAuthority,
            Constants.MINT_AMOUNT * Math.pow(10, Constants.TOKEM_DECIMAL)
        )
    );
    // send transaction
    const transactionSignature = await sendAndConfirmTransaction(
        connection,
        createTokenTx,
        [payer, mintKeypair]
    );
    console.log(
        `Create Token : https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
    );
    console.log("Token address:", mintKey.toBase58());
};

const createToken2022 = async () => {
    // Token variables
    let name, symbol, decimal = 9, totalSupply = 1_000_000;

    let mintKeypair = Keypair.generate();
    mintKey = mintKeypair.publicKey;

    // Create Token
    const extensions = [ExtensionType.TransferFeeConfig];
    const mintLen = getMintLen(extensions);
    const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
    console.log("required lamports: ", lamports);


    const tokenATA = await getAssociatedTokenAddress(mintKey, owner, false, TOKEN_2022_PROGRAM_ID);

    const createTokenTx = new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: mintKeypair.publicKey,
            space: mintLen,
            lamports,
            programId: TOKEN_2022_PROGRAM_ID
        }),
        // createInitializeMintCloseAuthorityInstruction(
        //     mintKey,
        //     closeAuthority,
        //     programId,
        // ),
        createInitializeTransferFeeConfigInstruction(
            mintKey,
            payer.publicKey,
            payer.publicKey,
            Constants.FEE_PERCENT,
            BigInt(Constants.MAX_FEE_AMOUNT),
            TOKEN_2022_PROGRAM_ID
        ),
        createInitializeMintInstruction(
            mintKey,
            decimal,
            mintAuthority,
            freezeAuthority,
            TOKEN_2022_PROGRAM_ID
        ),
        createAssociatedTokenAccountInstruction(
            payer.publicKey,
            tokenATA,
            owner,
            mintKey,
            TOKEN_2022_PROGRAM_ID
        ),
        createMintToInstruction(
            mintKey,
            tokenATA,
            mintAuthority,
            totalSupply * Math.pow(10, decimal),
            [],
            TOKEN_2022_PROGRAM_ID
        )
    );
    // send transaction
    const transactionSignature = await sendAndConfirmTransaction(
        connection,
        createTokenTx,
        [payer, mintKeypair]
    );
    console.log(
        `Create Token : https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
    );
    console.log("Token address:", mintKey.toBase58());
};

async function mintToken() {
    if (Constants.CREATE_TOKEN_FLAG) {
        await createToken();
        // await createToken2022();
    } else {
        mintKey = Constants.SWRD_TOKEN_MINT;
    }
    // metaplex setup
    const metaplex = Metaplex.make(connection)
        .use(keypairIdentity(user))
        .use(
            bundlrStorage({
                address: Constants.BUNDLR_ADDR,
                providerUrl: networkUrl,
                timeout: 60000,
            })
        );

    // file to buffer
    const buffer = fs.readFileSync("assets/logo.png");

    // buffer to metaplex file
    const file = toMetaplexFile(buffer, Constants.IMG_NAME);

    // upload image and get image uri
    const imageUri = await metaplex.storage().upload(file);
    console.log("image uri:", imageUri);

    // upload metadata and get metadata uri (off chain metadata)
    const { uri } = await metaplex.nfts().uploadMetadata({
        name: Constants.TOKEN_NAME,
        symbol: Constants.TOKEN_SYMBOL,
        description: Constants.TOKEN_DESCRIPTION,
        image: imageUri,
    });

    console.log("metadata uri:", uri);

    // get metadata account address
    // const metadataPDA = await findMetadataPda(tokenMint);
    const metadataPDA = metaplex.nfts().pdas().metadata({ mint: mintKey });
    const [metadataPDA1] = await PublicKey.findProgramAddress(
        [Buffer.from("metadata"), PROGRAM_ID.toBuffer(), mintKey.toBuffer()],
        PROGRAM_ID
    );
    console.log(`GET METADATA ACCOUNT ADDRESS is : ${metadataPDA}`);
    console.log(`GET METADATA ACCOUNT ADDRESS is : ${metadataPDA1}`);

    // onchain metadata format
    const tokenMetadata = {
        name: Constants.TOKEN_NAME,
        symbol: Constants.TOKEN_SYMBOL,
        uri: uri,
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
    };

    console.log("=============================");
    console.log("CREATING TRANSACTION");
    console.log("=============================");
    // transaction to create metadata account
    const transaction = new Transaction().add(
        createCreateMetadataAccountV3Instruction(
            {
                metadata: metadataPDA,
                mint: mintKey,
                mintAuthority: mintAuthority,
                payer: payer.publicKey,
                updateAuthority: updateAuthority,
                // systemProgram: TOKEN_2022_PROGRAM_ID
            },
            {
                createMetadataAccountArgsV3: {
                    data: tokenMetadata,
                    isMutable: true,
                    collectionDetails: null,
                },
            },
            // TOKEN_2022_PROGRAM_ID
        )
    );

    console.log(`METADATA TRANSACTİON : ${transaction}`);
    console.log("=============================");
    console.log("BEGIN SENDANDCONFIRMTRANSACTION");
    // send transaction
    const transactionSignature2 = await sendAndConfirmTransaction(
        connection,
        transaction,
        [payer]
    );

    console.log(
        `Create Metadata Account: https://explorer.solana.com/tx/${transactionSignature2}?cluster=devnet`
    );
    console.log("PublicKey:", user.publicKey.toBase58());
}


async function updateTokenMetadata() {
    mintKey = Constants.SWRD_TOKEN_MINT;
    // metaplex setup
    const metaplex = Metaplex.make(connection)
        .use(keypairIdentity(user))
        .use(
            bundlrStorage({
                address: Constants.BUNDLR_ADDR,
                providerUrl: networkUrl,
                timeout: 60000,
            })
        );

    // file to buffer
    const buffer = fs.readFileSync(Constants.IMG_PATH);

    // buffer to metaplex file
    const file = toMetaplexFile(buffer, Constants.IMG_NAME);

    // upload image and get image uri
    const imageUri = await metaplex.storage().upload(file);
    console.log("image uri:", imageUri);

    // upload metadata and get metadata uri (off chain metadata)
    const { uri } = await metaplex.nfts().uploadMetadata({
        name: Constants.TOKEN_NAME,
        symbol: Constants.TOKEN_SYMBOL,
        description: Constants.TOKEN_DESCRIPTION,
        image: imageUri,
    });

    console.log("metadata uri:", uri);

    // get metadata account address
    // const metadataPDA = await findMetadataPda(tokenMint);
    const metadataPDA = metaplex.nfts().pdas().metadata({ mint: mintKey });
    const [metadataPDA1] = await PublicKey.findProgramAddress(
        [Buffer.from("metadata"), PROGRAM_ID.toBuffer(), mintKey.toBuffer()],
        PROGRAM_ID
    );
    console.log(`GET METADATA ACCOUNT ADDRESS is : ${metadataPDA}`);
    console.log(`GET METADATA ACCOUNT ADDRESS is :: ${metadataPDA1}`);

    // onchain metadata format
    const tokenMetadata = {
        name: Constants.TOKEN_NAME,
        symbol: Constants.TOKEN_SYMBOL,
        uri: uri,
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
    };

    console.log("=============================");
    console.log("CREATING TRANSACTION");
    console.log("=============================");
    // transaction to create metadata account
    const transaction = new Transaction().add(
        createUpdateMetadataAccountV2Instruction
            (
                {
                    metadata: metadataPDA,
                    updateAuthority: updateAuthority,
                },
                {
                    updateMetadataAccountArgsV2: {
                        data: tokenMetadata,
                        updateAuthority: updateAuthority,
                        isMutable: true,
                        primarySaleHappened: false,
                    },
                }
                // Constants.IS_TOKEN_2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID
            )
    );

    console.log(`METADATA TRANSACTİON : ${transaction}`);
    console.log("=============================");
    console.log("BEGIN SENDANDCONFIRMTRANSACTION");
    // send transaction
    const transactionSignature2 = await sendAndConfirmTransaction(
        connection,
        transaction,
        [payer]
    );

    console.log(
        `Create Metadata Account: https://explorer.solana.com/tx/${transactionSignature2}?cluster=devnet`
    );
    console.log("PublicKey:", user.publicKey.toBase58());
}

const createSPLToken = async (name, symbol, decimal, totalSupply, wallet) => {
    let mintKeypair = Keypair.generate();
    mintKey = mintKeypair.publicKey;

    owner = new PublicKey(wallet);
    const newMintAuthority = new PublicKey(wallet);
    // freezeAuthority = wallet;
    // updateAuthority = wallet;

    // Create Token
    const requiredBalance = await getMinimumBalanceForRentExemptMint(connection);
    const tokenATA = await getAssociatedTokenAddress(mintKey, owner);

    const createTokenTx = new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: mintKey,
            space: MINT_SIZE,
            lamports: requiredBalance,
            programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
            mintKey,
            decimal,
            mintAuthority,
            freezeAuthority,
            TOKEN_PROGRAM_ID
        ),
        createAssociatedTokenAccountInstruction(
            payer.publicKey,
            tokenATA,
            owner,
            mintKey
        ),
        createMintToInstruction(
            mintKey,
            tokenATA,
            mintAuthority,
            totalSupply * Math.pow(10, decimal)
        )
    );
    // send transaction
    const transactionSignature = await sendAndConfirmTransaction(
        connection,
        createTokenTx,
        [payer, mintKeypair]
    );
    console.log(
        `Create Token : https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
    );
    console.log("Token address:", mintKey.toBase58());

    return transactionSignature;
};

async function mintSPLToken(name, symbol, decimal, totalSupply, tokenKind, wallet, logoPath, logoName) {
    const txHash = await createSPLToken(name, symbol, decimal, totalSupply, wallet);
    
    let newMintAuthority = new PublicKey(wallet);
    // metaplex setup
    const metaplex = Metaplex.make(connection)
        .use(keypairIdentity(user))
        .use(
            bundlrStorage({
                address: Constants.BUNDLR_ADDR,
                providerUrl: networkUrl,
                timeout: 60000,
            })
        );

    // file to buffer
    const buffer = fs.readFileSync(logoPath);

    // buffer to metaplex file
    const file = toMetaplexFile(buffer, logoName);

    // upload image and get image uri
    const imageUri = await metaplex.storage().upload(file);
    console.log("image uri:", imageUri);

    // upload metadata and get metadata uri (off chain metadata)
    const { uri } = await metaplex.nfts().uploadMetadata({
        name,
        symbol,
        description: Constants.TOKEN_DESCRIPTION,
        image: imageUri,
    });

    console.log("metadata uri:", uri);

    // get metadata account address
    // const metadataPDA = await findMetadataPda(tokenMint);
    const metadataPDA = metaplex.nfts().pdas().metadata({ mint: mintKey });
    const [metadataPDA1] = await PublicKey.findProgramAddress(
        [Buffer.from("metadata"), PROGRAM_ID.toBuffer(), mintKey.toBuffer()],
        PROGRAM_ID
    );
    console.log(`GET METADATA ACCOUNT ADDRESS is : ${metadataPDA}`);
    console.log(`GET METADATA ACCOUNT ADDRESS is : ${metadataPDA1}`);

    // onchain metadata format
    const tokenMetadata = {
        name,
        symbol,
        uri: uri,
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
    };

    console.log("=============================");
    console.log("CREATING TRANSACTION");
    console.log("=============================");
    // transaction to create metadata account
    const transaction = new Transaction().add(
        createCreateMetadataAccountV3Instruction(
            {
                metadata: metadataPDA,
                mint: mintKey,
                mintAuthority: mintAuthority,
                payer: payer.publicKey,
                updateAuthority: updateAuthority,
                // systemProgram: TOKEN_2022_PROGRAM_ID
            },
            {
                createMetadataAccountArgsV3: {
                    data: tokenMetadata,
                    isMutable: true,
                    collectionDetails: null,
                },
            },
            // TOKEN_2022_PROGRAM_ID
        ),
        createSetAuthorityInstruction(
            mintKey,
            mintAuthority,
            0, // Autority Type: 0: MintAutority,
            newMintAuthority,
            [],
            TOKEN_PROGRAM_ID
        )
    );

    console.log(`METADATA TRANSACTİON : ${transaction}`);
    console.log("=============================");
    console.log("BEGIN SENDANDCONFIRMTRANSACTION");
    // send transaction
    const transactionSignature2 = await sendAndConfirmTransaction(
        connection,
        transaction,
        [payer]
    );

    console.log(
        `Create Metadata Account: https://explorer.solana.com/tx/${transactionSignature2}?cluster=devnet`
    );
    console.log("PublicKey:", user.publicKey.toBase58());

    return mintKey.toString()
}


module.exports = {
    mintSPLToken
}