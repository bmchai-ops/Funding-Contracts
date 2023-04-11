// Start - Support direct Mocha run & debug
import 'hardhat'
import '@nomiclabs/hardhat-ethers'
// End - Support direct Mocha run & debug

import chai, {expect} from 'chai'
import {before} from 'mocha'
import {solidity} from 'ethereum-waffle'
import {deployContract, signer} from './framework/contracts'
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {successfulTransaction} from './framework/transaction'
import {ComeFundMe} from '../typechain-types'
import {ethers} from 'ethers'

chai.use(solidity)

describe('HW5: 6%', () => {
    let s0: SignerWithAddress, s1: SignerWithAddress
    let contract: ComeFundMe
    before(async () => {
        s0 = await signer(0)
        s1 = await signer(1)
    })

    beforeEach(async () => {
        contract = await deployContract<ComeFundMe>('ComeFundMe')
    })

    describe('Unit Tests', () => {
        describe('getCampaignId', () => {
            it('#1', async () => {
                const title = 'New Campaign'
                const description = 'This is a new campaign'
                const actualValue = await contract.getCampaignId(
                    s0.address,
                    title,
                    description
                )
                const expectedValue = ethers.utils.solidityKeccak256(
                    ['address', 'string', 'string'],
                    [s0.address, title, description]
                )
                expect(actualValue).to.equal(expectedValue)
            })
            it('#2', async () => {
                const title = 'nother campaign'
                const description = 'This is a nother campaign'
                const actualValue = await contract.getCampaignId(
                    s0.address,
                    title,
                    description
                )
                const expectedValue = ethers.utils.solidityKeccak256(
                    ['address', 'string', 'string'],
                    [s0.address, title, description]
                )
                expect(actualValue).to.equal(expectedValue)
            })
        })

        describe('startCampaign', () => {
            const title = 'New Campaign'
            const description = 'New campaign description'
            it('#1: should emit proper event', async () => {
                const campaignId = await contract.getCampaignId(
                    s0.address,
                    title,
                    description
                )
                const tx = await contract
                    .connect(s0)
                    .startCampaign(title, description)
                void expect(tx)
                    .to.emit(contract, 'CampaignStarted')
                    .withArgs(campaignId)
            })
            it('#2: should not begin identical campaign', async () => {
                const campaignId = await contract.getCampaignId(
                    s0.address,
                    title,
                    description
                )
                const tx = await contract
                    .connect(s0)
                    .startCampaign(title, description)
                await expect(
                    contract.connect(s0).startCampaign(title, description)
                ).to.be.reverted
            })
        })

        describe('getCampaign', () => {
            it('#1', async () => {
                const title = 'Campaign 1'
                const description = 'Campaign description'
                const campaignId = await contract.getCampaignId(
                    s0.address,
                    title,
                    description
                )
                await successfulTransaction(
                    contract.connect(s0).startCampaign(title, description)
                )
                const campaign = await contract.getCampaign(campaignId)
                expect(campaign.isAlive).to.be.true
                expect(campaign.initiator).to.equal(s0.address)
                expect(campaign.fundsRaised).to.equal(0)
                expect(campaign.title).to.equal(title)
                expect(campaign.description).to.equal(description)
            })
            it('#1', async () => {
                const title = 'Campaign 2'
                const description = 'Campaign 2 description'
                const campaignId = await contract.getCampaignId(
                    s0.address,
                    title,
                    description
                )
                await successfulTransaction(
                    contract.connect(s0).startCampaign(title, description)
                )
                const campaign = await contract.getCampaign(campaignId)
                expect(campaign.isAlive).to.be.true
                expect(campaign.initiator).to.equal(s0.address)
                expect(campaign.fundsRaised).to.equal(0)
                expect(campaign.title).to.equal(title)
                expect(campaign.description).to.equal(description)
            })
        })
        describe('donatetoCampaign', () => {
            it('#2 Campaign can be donated to', async () => {
                const title = 'Campaign 1'
                const description = 'Campaign description'
                const money = ethers.utils.parseEther('4')
                const campaignId = await contract.getCampaignId(
                    s0.address,
                    title,
                    description
                )
                await contract.connect(s0).startCampaign(title, description)
                await contract.connect(s0).donateToCampaign(campaignId, {
                    value: money
                })
                const campaign = await contract.getCampaign(campaignId)
                expect(campaign.fundsRaised).equals(money)
            })
            it('#1 should emit proper event', async () => {
                const title = 'Campaign 1'
                const description = 'Campaign description'
                const campaignId = await contract.getCampaignId(
                    s0.address,
                    title,
                    description
                )
                await contract.connect(s0).startCampaign(title, description)
                const money = ethers.utils.parseEther('4')
                const tx = await contract
                    .connect(s0)
                    .donateToCampaign(campaignId, {value: money})
                void expect(tx)
                    .to.emit(contract, 'CampaignDonationReceived')
                    .withArgs(campaignId, s0.address, money)
            })
        })
        describe('togglePause', () => {
            it('should toggle pause from unpaused to paused', async () => {
                await contract.connect(s0).togglePause()
                expect(await contract.paused()).equals(true)
            })
            it('should toggle pause from paused to unpaused', async () => {
                await contract.connect(s0).togglePause()
                await contract.connect(s0).togglePause()
                expect(await contract.paused()).equals(false)
            })
        })
        describe('endCampaign', () => {
            it('Should only end by campaign initiator', async () => {
                const title = 'Campaign 1'
                const description = 'Campaign description'
                const campaignId = await contract.getCampaignId(
                    s0.address,
                    title,
                    description
                )
                await contract.connect(s0).startCampaign(title, description)
                const campaign = await contract.getCampaign(campaignId)
                await expect(contract.connect(s1).endCampaign(campaignId)).to.be
                    .reverted
            })
            it('Should only end while not paused', async () => {
                const title = 'Campaign 1'
                const description = 'Campaign description'
                const campaignId = await contract.getCampaignId(
                    s0.address,
                    title,
                    description
                )
                await contract.connect(s0).startCampaign(title, description)
                const campaign = await contract.getCampaign(campaignId)
                await contract.connect(s0).togglePause()
                await expect(contract.connect(s1).endCampaign(campaignId)).to.be
                    .reverted
            })
        })
    })
    describe('Functional test', () => {
        describe('Normal Walk Through', () => {
            it('#1', async () => {
                const title = 'New Campaign'
                const description = 'New campaign description'
                const campaignId = await contract.getCampaignId(
                    s0.address,
                    title,
                    description
                )
                const tx = await contract
                    .connect(s0)
                    .startCampaign(title, description)
                void expect(tx)
                    .to.emit(contract, 'CampaignStarted')
                    .withArgs(campaignId)
                const money = ethers.utils.parseEther('4')
                await contract.connect(s0).donateToCampaign(campaignId, {
                    value: money
                })
                const campaign = await contract.getCampaign(campaignId)
                expect(campaign.isAlive).to.be.true
                expect(campaign.initiator).to.equal(s0.address)
                expect(campaign.fundsRaised).to.equal(money)
                expect(campaign.title).to.equal(title)
                expect(campaign.description).to.equal(description)
                expect(campaign.fundsRaised).equals(money)
                const end = await contract.connect(s0).endCampaign(campaignId)
                await expect(end)
                    .to.emit(contract, 'CampaignEnded')
                    .withArgs(campaignId, money)
            })
        })
        describe('Revert Check', () => {
            it('1', async () => {
                const title = 'Campaign 1'
                const description = 'Campaign description'
                const campaignId = await contract.getCampaignId(
                    s0.address,
                    title,
                    description
                )
                await contract.connect(s0).startCampaign(title, description)
                await expect(
                    contract.connect(s0).startCampaign(title, description)
                ).to.be.reverted
                await expect(contract.connect(s1).endCampaign(campaignId)).to.be
                    .reverted
                await contract.connect(s0).togglePause()
                await expect(contract.connect(s1).endCampaign(campaignId)).to.be
                    .reverted
            })
        })
    })
})
