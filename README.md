# apisrv

**apisrv** is a backend application developed in Deno that facilitates native operations on a server or a local computer, such as direct printing to a printer (e.g., label printing). The application supports multiple communication methods to trigger these operations, providing flexible ways to interact with the server.

## Features

- **Native Operations**: Execute operations on the server or a local machine, such as direct printing to a designated printer.
- **Multiple Communication Methods**:
  - **GraphQL**: Allows for structured querying and interaction with the server.
  - **Command-Line Interface**: Execute commands directly through command-line parameters.
  - **File-based Requests**: Use JSON files containing requests to interact with the application.

## Getting Started

To get started with apisrv, ensure you have [Deno](https://deno.land/) installed on your system. Follow the instructions below to set up and run the application.

## Installation

Clone the repository, then run the application using Deno:

```bash
git clone <repository-url>
cd apisrv
deno run --allow-net --allow-read main.ts
