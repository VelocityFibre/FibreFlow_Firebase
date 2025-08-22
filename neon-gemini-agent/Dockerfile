FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Make scripts executable
RUN chmod +x scripts/*.js tests/*.js

# Create config directory
RUN mkdir -p config

# Default command
CMD ["node", "scripts/neon-gemini-query.js"]