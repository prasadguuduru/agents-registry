# Agent Registry Web Application

This React application serves as a centralized registry for agent-to-agent communication using OAuth2 authentication. It provides a comprehensive interface for managing agents, access controls, token generation, and audit trails.

## Features

- 🔐 **Agent Registration**: Register new agents to the system
- 👥 **Agent Directory**: Browse and search for registered agents
- 🛡️ **Access Control**: Request and approve access between agents
- 🔑 **Token Management**: Generate, validate, and revoke OAuth2 tokens
- 📊 **Analytics Dashboard**: Monitor system usage and activity
- 📋 **Audit Trail**: Track all system activities with detailed logs
- 🌙 **Dark Mode**: Toggle between light and dark theme

## Prerequisites

- Node.js (version 14.x or higher)
- npm or yarn package manager

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/agent-registry.git
   cd agent-registry
   ```

2. Install dependencies:
   ```
   npm install
   ```
   or with yarn:
   ```
   yarn install
   ```

3. Configure the API endpoint:
   - Create a `.env` file in the root directory
   - Add the following line with your API URL:
     ```
     REACT_APP_API_URL=https://0ayys8nze8.execute-api.us-east-1.amazonaws.com/prod
     ```

4. Start the development server:
   ```
   npm start
   ```
   or with yarn:
   ```
   yarn start
   ```

5. The application will open in your browser at `http://localhost:3000`

## Deployment

1. Build the production-ready application:
   ```
   npm run build
   ```
   or with yarn:
   ```
   yarn build
   ```

2. The optimized build will be created in the `build` folder, which you can deploy to any static hosting service.

## Demo Credentials

The application includes demo credentials for testing:

- **Admin User**:
  - Username: `admin`
  - Password: `password`

- **Regular User**:
  - Username: `user`
  - Password: `password`

## Project Structure

```
/src
  /components        # Reusable UI components
  /context           # React context providers
  /pages             # Application pages
  /services          # API and utility services
  App.js             # Main application component
  index.js           # Application entry point
/public              # Static assets
```

## API Integration

The application integrates with the Agent Registry API to perform various operations. All API calls are made through the `apiService.js` file, which provides methods for:

- Registering agents
- Listing and searching agents
- Managing access control
- Generating and validating tokens
- Retrieving audit trails

## Role-Based Access Control

The application implements role-based access control:

- **Admin**: Full access to all features including audit trails
- **User**: Limited access to agent management and token operations

## Further Development

Future enhancements that could be implemented:

- Extended authentication methods (SSO, MFA)
- Real-time notifications for access requests
- Advanced analytics and reporting
- Agent subscription tiers
- Enhanced security features

## License

[MIT License](LICENSE)

## Contact

For any questions or support, please contact [your-email@example.com](mailto:your-email@example.com)