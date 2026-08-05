# Transaction Manager

<p align="center">
  <picture style="width: 500px">
    <source media="(prefers-color-scheme: light)" srcset="/assets/Banner-Light.png" />
    <source media="(prefers-color-scheme: dark)" srcset="/assets/Banner-Dark.png" />
    <img src="/assets/Banner-Dark.png" width="100%" alt="Transaction Manager logo and name" />
  </picture>
</p>

Transaction Manager is a web application that allows users to create Records and manage Transactions. It is built using Next.js

## Technologies Used

![Technologies](https://go-skill-icons.vercel.app/api/icons?i=next,typescript,prisma,react,tailwind,shadcn,jwt,i18n)

## Installation

1. Clone the repository:

```
git clone https://github.com/your-username/transaction-manager.git
```

2. Install dependencies:

```
cd transaction-manager npm install
```

## Usage

1. Start the development server:

```
npm run dev
```

1. Access the application in your browser at `http://localhost:3000`.

## Contributing

Contributions are welcome! If you have any ideas, suggestions, or bug reports, please open an issue or submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).

## AI Agent Instructions

This project has a knowledge graph at `graphify-out/` with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when `graphify-out/graph.json` exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
