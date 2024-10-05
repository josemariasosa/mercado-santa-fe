# Mercado Santa Fe 🌮

Lending and borrowing protocol for Fixed-Rate Loans in Mexican Pesos.

## Project Description

The objective of this project is to create an app that allows users to request a fixed-rate loan in Mexican pesos.

Initially, loans will be collateralized using US dollars. This means the user will lock an amount N of dollars, which will grant them an amount X of Mexican pesos, with a fixed interest rate. For example, an 8.00% annual fixed rate.

The user will be able to define a payment plan according to their needs.

If the user does not meet the payment deadlines or does not cover the total amount at the end of the period, the collateral will be liquidated to cover the debt plus penalty fees.

The loans can be used to pay for services such as electricity, water, and gas.

The medium to long-term vision is to automate the loan process to shift the risk to investors who are willing to generate returns, allowing users to obtain microloans without the need for collateralization.

## APY Calculation

One of the most important parameters of the fixed-rate loan is the APY. The value should consider:

- Initial LTV. Less than or around 50% should have low impact. 8% is the max allowed LTV, with the highest APY.
- Loan duration.

## Technologies Used

- **Solidity**: Language for developing smart contracts.
- **Hardhat**: Ethereum development environment that simplifies compiling, testing, and deploying smart contracts.

## Requirements

Make sure you have the following installed:

- Node.js (LTS version recommended)
- npm or yarn
- Hardhat

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-name>
Install the dependencies:
bash
Copy code
npm install
or, if you are using yarn:
bash
Copy code
yarn install
Compile Contracts
To compile the smart contracts, use the following command:

bash
Copy code
npx hardhat compile
Run Tests
You can run the tests with this command:

bash
Copy code
npx hardhat test
Deploy Contracts
Make sure to configure your network in the hardhat.config.js file, and then use the following command to deploy:

bash
Copy code
npx hardhat run scripts/deploy.js --network <network-name>
License
This project is licensed under the MIT License.

Lending and

# Proyecto de Préstamo a Tasa Fija en Pesos Mexicanos

## Descripción

El objetivo de este proyecto es crear una aplicación que le permita a los usuarios pedir un préstamo de renta fija en pesos mexicanos.

Inicialmente, los préstamos serán colateralizados mediante dólares estadounidenses. Esto significa que el usuario bloqueará una cantidad N de dólares, lo que le brindará una cantidad X de pesos mexicanos, con una tasa fija. Por ejemplo, una tasa fija del 8.00% anual.

El usuario podrá definir un plan de pagos de acuerdo a sus necesidades.

Si el usuario no cumple con las fechas de pago o no cubre el total al finalizar el periodo, el colateral será liquidado para cubrir la deuda más los gastos por penalización.

Los préstamos pueden ser utilizados para pagar servicios como luz, agua, gas, entre otros.

La visión a largo/mediano plazo es automatizar el proceso de préstamos para mover el riesgo a inversionistas dispuestos a generar rendimientos, permitiendo a los usuarios obtener microcréditos sin la necesidad de colateralizarse.

## Tecnologías Utilizadas

- **Solidity**: Lenguaje para el desarrollo de contratos inteligentes.
- **Hardhat**: Entorno de desarrollo para Ethereum que facilita la compilación, prueba y despliegue de contratos inteligentes.

## Requisitos

Asegúrate de tener instalados los siguientes elementos:

- Node.js (versión LTS recomendada)
- npm o yarn
- Hardhat

## Instalación

1. Clona el repositorio:
   ```bash
   git clone <url-del-repositorio>
   cd <nombre-del-repositorio>
Instala las dependencias:
bash
Copy code
npm install
o, si usas yarn:
bash
Copy code
yarn install
Compilar Contratos
Para compilar los contratos inteligentes, utiliza el siguiente comando:

bash
Copy code
npx hardhat compile
Probar Contratos
Puedes ejecutar las pruebas usando el siguiente comando:

bash
Copy code
npx hardhat test
Desplegar Contratos
Asegúrate de configurar tu red en el archivo hardhat.config.js y utiliza el comando para desplegar:

bash
Copy code
npx hardhat run scripts/deploy.js --network <red>
Licencia
Este proyecto está bajo la Licencia MIT.

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.js
```
