FROM node:20-bookworm AS build
WORKDIR /workspace
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /workspace/dist/agentchain-ui-full /usr/share/nginx/html
EXPOSE 80
