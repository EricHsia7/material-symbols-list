# Material Symbols List

A comprehensive, indexed collection of Material Symbols with enhanced search capabilities and TypeScript type definitions.

## Features

This repository provides a complete catalog of Material Symbols with additional features:

- Comprehensive listing: Complete catalog of all Material Symbols
- Visual Search: Find symbols using semantic tags visually matched by the CLIP model
- Smart Synonyms: Tag synonymies are mapped and expanded using a local LLM (`gemma4:e4b`) to bridge the gap between official names and natural human vocabulary
- TypeScript support: Includes type definitions
- Up To Date: Regularly updated distribution files

## Distribution Files

All files can be found on [dist branch](https://github.com/EricHsia7/material-symbols-list/tree/dist) and accessed via `https://erichsia7.github.io/material-symbols-list/<filename>`. See [mainfest.json](https://erichsia7.github.io/material-symbols-list/mainfest.json) for the catalog.

### index

Complete catalog of Material Symbols with metadata

### search-index

AI-enhanced search index for semantic symbol discovery

### description

AI-generated descriptions.

### similarity

Pre-computed cosine similarity.

### TypeScript type definitions

#### Install

```bash
npm install github:EricHsia7/material-symbols-list#dist --save-dev
```

in package.json

```diff
"devDependencies": {
+ "@erichsia7/material-symbols-list": "github:EricHsia7/material-symbols-list#dist"
}
```

#### Usage

Direct import

```typescript
import type { MaterialSymbol } from '@erichsia7/material-symbols-list';
```

Re-export

```typescript
export type { MaterialSymbol } from '@erichsia7/material-symbols-list';
```

Extended re-export

```typescript
import type { MaterialSymbol as _MaterialSymbol } from '@erichsia7/material-symbols-list';
export type MaterialSymbol = _MaterialSymbol | '';
```


## Build Process

The repository automatically updates using the following workflow:

1. Pull latest SVG files from [@marella/material-symbols](https://github.com/marella/material-symbols)
2. Convert SVG files to PNG format for raster applications
3. Pair icons with semantic tags using CLIP model ([@openai/CLIP](https://github.com/openai/CLIP))
4. Generate descriptions and list synonymies using local LLM (gemma4:e4b)
5. Build and compress search indices
6. Update distribution files

## Affiliated Repositories

- [@EricHsia7/material-symbols-list-viewer](https://github.com/EricHsia7/material-symbols-list-viewer)
