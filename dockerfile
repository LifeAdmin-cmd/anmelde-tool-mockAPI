# Use an official Node runtime as a parent image
FROM node:14

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install
RUN npm install -g nodemon
RUN npm install jsoneditor

# Bundle app source and the db
COPY src/ ./src/
COPY db/ ./db/

# Expose port
EXPOSE 3042

# Define the command to run the app
CMD ["nodemon", "src/index.js"]

