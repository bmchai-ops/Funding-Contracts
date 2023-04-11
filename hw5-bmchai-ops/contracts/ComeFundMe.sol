//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract ComeFundMe is Ownable, Pausable {
    struct Campaign {
        bool isAlive;
        address initiator;
        uint256 fundsRaised;
        string title;
        string description;
    }
    mapping(bytes32 => Campaign) private _campaigns;

    event CampaignStarted(bytes32 campaignId);
    event CampaignEnded(bytes32 campaignId, uint256 fundsRaised);
    event CampaignDonationReceived(
        bytes32 campaignId,
        address donor,
        uint256 amount
    );

    /**
        @notice Toggles the pause status using ternary operators
        @dev If paused() is true, then we unpause. Else, pause.
     */
    function togglePause() external onlyOwner {
        paused() ? _unpause() : _pause();
    }

    /**
        @notice Starts a fundraising campaign
        @param title The title of this new campaign (to be displayed on a website, for example)
        @param description The description of this new campaign (to be displayed on a website, for example)
     */
    function startCampaign(string calldata title, string calldata description)
        external
        whenNotPaused
    {
        bytes32 campaignId = getCampaignId(_msgSender(), title, description);
        Campaign storage c = _campaigns[campaignId];
        require(!c.isAlive && c.initiator == address(0), "Campaign exists");
        c.isAlive = true;
        c.initiator = _msgSender();
        c.title = title;
        c.description = description;
        emit CampaignStarted(campaignId);
    }

    /**
        @notice Ends a fundraising campaign, all raised funds transferred to the initiator
        @dev Can only be called by the campaign initiator
        @param campaignId The ID of the campaign that we are trying to end
     */
    function endCampaign(bytes32 campaignId) external whenNotPaused {
        Campaign storage c = _campaigns[campaignId];
        require(c.initiator == _msgSender(), "Not campaign owner");
        require(c.isAlive, "Already ended");
        c.isAlive = false;
        payable(c.initiator).transfer(c.fundsRaised);
        emit CampaignEnded(campaignId, c.fundsRaised);
    }

    /**
        @notice Donates ETH to a certain campaign
        @param campaignId The ID of the campaign that we are trying to donate to
     */
    function donateToCampaign(bytes32 campaignId)
        external
        payable
        whenNotPaused
    {
        Campaign storage c = _campaigns[campaignId];
        require(c.isAlive, "Already ended");
        c.fundsRaised += msg.value;
        emit CampaignDonationReceived(campaignId, _msgSender(), msg.value);
    }

    /**
        @notice Returns information for a specific campaign
        @param campaignId The ID of the campaign that we are trying to query
        @return A struct containing information about the given campaign
     */
    function getCampaign(bytes32 campaignId)
        external
        view
        returns (Campaign memory)
    {
        return _campaigns[campaignId];
    }

    /**
        @notice Generates a campaign ID given identifying information
        @param initiator The initiator of the campaign
        @param title The title of the campaign
        @param description The description of the campaign
        @return The generated campaign ID
     */
    function getCampaignId(
        address initiator,
        string calldata title,
        string calldata description
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(initiator, title, description));
    }
}
