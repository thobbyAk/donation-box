import { React, useState, Fragment, useEffect } from "react";
import { Menu, Transition } from "@headlessui/react";
import Web3Modal from "web3modal";
import { ethers, providers } from "ethers";

import DonationBox from "../src/abi/donationBoxAbi.json";
import { donationBoxContractAddress } from "./config";
import spinner from "../src/assets/spinner.svg";
import { shortenAddress } from "./lib/utils";
import Swal from "sweetalert2";
function classNames(...classes) {
	return classes.filter(Boolean).join(" ");
}

function App() {
	const [account, setAccount] = useState("");
	const [donations, setDonations] = useState(0);
	const [walletConnected, setWalletConnected] = useState(false);
	const [loading, setloading] = useState(false);
	const [web3Modal, setWeb3Modal] = useState(null);
	const [formInput, updateFormInput] = useState({
		amount: "",
	});

	useEffect(() => {
		const providerOptions = {};

		const newWeb3Modal = new Web3Modal({
			cacheProvider: true,
			network: "goerli",
			providerOptions,
		});

		setWeb3Modal(newWeb3Modal);
	}, []);

	useEffect(() => {
		// connect automatically and without a popup if user is already connected
		if (web3Modal && web3Modal.cachedProvider) {
			connectWallet();
		}
	}, [web3Modal]);

	async function addListeners(web3ModalProvider) {
		web3ModalProvider.on("accountsChanged", (accounts) => {
			connectWallet();
			// checkIsAdmin();
		});

		// Subscribe to chainId change
		web3ModalProvider.on("chainChanged", (chainId) => {
			connectWallet();
		});
	}

	async function connectWallet() {
		const provider = await web3Modal.connect();
		addListeners(provider);
		const ethersProvider = new providers.Web3Provider(provider);
		const userAddress = await ethersProvider.getSigner().getAddress();
		const userBalance = await ethersProvider.getBalance(userAddress);

		const { chainId } = await ethersProvider.getNetwork();
		setAccount(userAddress);
		setWalletConnected(true);
		if (chainId !== 5) {
			checkifUserisConnectedToGoerli();
		}
	}

	async function checkifUserisConnectedToGoerli() {
		try {
			await window.ethereum.request({
				method: "wallet_switchEthereumChain",
				params: [{ chainId: "0x5" }],
			});
			console.log("here switch");
		} catch (err) {
			// This error code indicates that the chain has not been added to MetaMask
			if (err.code === 4902) {
				await window.ethereum.request({
					method: "wallet_addEthereumChain",
					params: [
						{
							chainName: "Goerli Testnet",
							chainId: "0x5",
							nativeCurrency: { name: "Goerli", decimals: 18, symbol: "ETH" },
							rpcUrls: ["https://rpc.ankr.com/eth_goerli"],
						},
					],
				});
			}
		}
	}

	const disconnectWallet = async () => {
		await web3Modal.clearCachedProvider();

		setWalletConnected(false);
	};

	async function makeDonation() {
		if (account === "") {
			return alert("please connect to metamask wallet to donate");
		}
		if (formInput.amount == "") {
			return alert("please enter an amount to donate");
		}
		setloading(true);
		const { amount } = formInput;
		const web3Modal = new Web3Modal();
		const connection = await web3Modal.connect();
		const provider = new ethers.providers.Web3Provider(connection);
		const signer = provider.getSigner();
		let nonce = await provider.getTransactionCount(account);
		let gasPrice = await provider.getGasPrice();
		const donationAmount = ethers.utils.parseUnits(amount.toString(), "ether");
		let contract = new ethers.Contract(
			donationBoxContractAddress,
			DonationBox.abi,
			signer
		);

		let overides = {
			gasPrice: 2 * gasPrice,
			gasLimit: 10 * 21000,
			value: donationAmount,
			nonce: nonce,
		};

		let transaction = await contract.donate(overides);
		let tx = await transaction.wait();
		setloading(false);
		let event = tx.events[0];
		const newDonation = ethers.utils.formatUnits(
			event.args[1].toString(),
			"ether"
		);
		if (event.event === "DonationTransferred") {
			getTotalDonations();
			updateFormInput({
				amount: "",
			});
			Swal.fire({
				title: "Success",
				text: `Your Donation of ${newDonation} ETH was succsesful`,
				icon: "success",
				showConfirmButton: false,
				timer: 2000,
				background: "#241c2d",
			});
		}
	}

	async function getTotalDonations() {
		const provider = new ethers.providers.JsonRpcProvider(
			`https://rpc.ankr.com/eth_goerli`
		);
		const donationContract = new ethers.Contract(
			donationBoxContractAddress,
			DonationBox.abi,
			provider
		);
		const data = await donationContract.getTotalDonations();

		const newDonation = ethers.utils.formatUnits(data.toString(), "ether");
		setDonations(newDonation);
	}

	useEffect(() => {
		getTotalDonations();
	}, []);

	return (
		<div className="App">
			<div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-gradient-to-r from-[#291f32] to-[#291f32] shadow">
				<div className="flex flex-1 justify-between px-4">
					<div className="flex flex-1"></div>
					<div className="ml-4 flex items-center md:ml-6">
						{/* Profile dropdown */}
						{walletConnected ? (
							<>
								<button
									type="button"
									className="inline-flex items-center rounded-md border border-transparent bg-[#9A76D9] px-4 py-2 text-sm font-medium text-[#30253f] shadow-sm  hover:bg-[#bd94eb] focus:outline-none focus:ring-2 focus:ring-offset-2"
								>
									{shortenAddress(account)}
								</button>
								<Menu as="div" className="relative ml-3">
									<div>
										<Menu.Button className="flex max-w-xs items-center rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
											<span className="sr-only">Open user menu</span>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
												fill="currentColor"
												className="w-6 h-6"
											>
												<path
													fillRule="evenodd"
													d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
													clipRule="evenodd"
												/>
											</svg>
										</Menu.Button>
									</div>
									<Transition
										as={Fragment}
										enter="transition ease-out duration-100"
										enterFrom="transform opacity-0 scale-95"
										enterTo="transform opacity-100 scale-100"
										leave="transition ease-in duration-75"
										leaveFrom="transform opacity-100 scale-100"
										leaveTo="transform opacity-0 scale-95"
									>
										<Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
											<Menu.Item>
												{({ active }) => (
													<>
														<a
															href={`https://etherscan.io/address/${account}`}
															className={classNames(
																active ? "bg-gray-100" : "",
																"block px-4 py-2 text-sm text-gray-700"
															)}
														>
															View on Etherscan
														</a>
														<a
															onClick={() => disconnectWallet()}
															className={classNames(
																active ? "bg-gray-100" : "",
																"block px-4 py-2 text-sm cursor-pointer text-gray-700"
															)}
														>
															Disconnect Wallet
														</a>
													</>
												)}
											</Menu.Item>
										</Menu.Items>
									</Transition>
								</Menu>
							</>
						) : (
							<button
								onClick={() => {
									connectWallet();
								}}
								type="button"
								className="inline-flex hover:bg-[#bd94eb]  items-center rounded-md border border-transparent bg-[#9A76D9] text-[#30253f] px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
							>
								Connet Wallet
							</button>
						)}
					</div>
				</div>
			</div>

			<div className="grid h-screen place-items-center bg-[#000000]">
				<div className="p-5">
					<h3 className="text-gray-300 mb-5 text-lg">
						Total Donations {donations} ETH{" "}
					</h3>
					<h3 className="text-gray-300 text-lg">Please Donate Below</h3>

					<div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
						<div className="sm:col-span-3">
							<label
								htmlFor="first-name"
								className="block text-sm font-medium text-gray-400"
							>
								Amount
							</label>
							<div className="mt-1">
								<input
									type="text"
									name="amount"
									placeholder="Amount in ETH"
									onChange={(e) =>
										updateFormInput({ ...formInput, amount: e.target.value })
									}
									className="block pl-4 w-full h-12 rounded-lg text-white shadow-sm bg-[#1b171d] sm:text-sm"
								/>
							</div>
						</div>
					</div>
					<div className="flex justify-start mt-5">
						<button
							onClick={() => {
								makeDonation();
							}}
							className="inline-flex items-center justify-center rounded-md border border-transparent py-2 px-4 text-sm font-medium text-[#30253f]  bg-[#9A76D9] shadow-sm hover:bg-[#bd94eb]  focus:outline-none focus:ring-2  focus:ring-offset-2"
						>
							{loading && (
								<img className="animate-spin mr-3   w-5 h-5" src={spinner} />
							)}
							Donate
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default App;
