# Stock-Canister

## Overview
This project implements a simple stock management system on the Azle platform, allowing users to create accounts, manage stock portfolios, and perform stock transactions. The system is built using the Azle library, providing a secure and decentralized environment for stock-related operations.

## Prerequisites
- Node
- Typescript
- DFX

## Installation

1. **Clone the repository:**
    ```bash
    git clone https://github.com/ImanuelSG/Stock-Canister.git
    cd stock-canister
    nvm install 18
    nvm use 18
    npm install
    ```
2. **INSTALL DFX**
    ```bash
    DFX_VERSION=0.14.1 sh -ci "$(curl -fsSL https://sdk.dfinity.org/install.sh)"
    ```
3. **Add DFX to your path**
    ```bash
    echo 'export PATH="$PATH:$HOME/bin"' >> "$HOME/.bashrc"
    ```

## Usage

Here are the main functionalities provided by this system:

### Account Management

- `createAccount`
  - Creates a new user account for stock management.

### Stock Management

- `createStock`
  - Creates a new stock with specified details.
- `deleteStock`
  - Deletes a stock with specified details.
- `buyStock`
  - Allows a user to buy a certain quantity of a stock.
- `sellStock`
  - Allows a user to sell a certain quantity of a stock.
- `getPortfolio`
  - Retrieves the stock portfolio of the user.

## Testing Instructions 

- Make sure you have the required environment for running ICP canisters, and dfx is running in the background (`dfx start --background --clean`).
- Deploy the canisters: `dfx deploy`.
- Open the URL for the Backend canister via the Candid interface.

To conclude your work session, you can stop your local Azle replica by executing the following command in your terminal:
  ```bash
   dfx stop
