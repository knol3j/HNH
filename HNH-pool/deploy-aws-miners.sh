#!/bin/bash

# Deploy HashNHedge miners to AWS instances
# Run this script to set up mining on all three AWS instances

echo "🚀 HashNHedge AWS Mining Deployment"
echo "===================================="

# Your AWS instance IPs
AWS_IPS=(
    "35.160.120.126"
    "44.233.151.27"
    "34.211.200.85"
)

# Your wallet address (REPLACE WITH YOUR ACTUAL WALLET)
WALLET_ADDRESS="${WALLET_ADDRESS:-YOUR_SOLANA_WALLET_ADDRESS_HERE}"

# SSH key path (adjust as needed)
SSH_KEY="${SSH_KEY:-~/.ssh/id_rsa}"
SSH_USER="${SSH_USER:-ubuntu}"  # or ec2-user for Amazon Linux

echo "📍 Target instances: ${#AWS_IPS[@]}"
echo "💼 Wallet: $WALLET_ADDRESS"
echo "🔑 SSH Key: $SSH_KEY"
echo "👤 SSH User: $SSH_USER"
echo ""

# Check wallet address
if [ "$WALLET_ADDRESS" = "YOUR_SOLANA_WALLET_ADDRESS_HERE" ]; then
    echo "❌ ERROR: Please set your wallet address!"
    echo "Usage: WALLET_ADDRESS=your_wallet_here ./deploy-aws-miners.sh"
    exit 1
fi

# Function to deploy to a single instance
deploy_to_instance() {
    local ip=$1
    local instance_num=$2

    echo "🎯 Deploying to instance $instance_num: $ip"

    # Test SSH connectivity
    if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$SSH_USER@$ip" "echo 'SSH test successful'" 2>/dev/null; then
        echo "❌ Cannot connect to $ip via SSH"
        return 1
    fi

    # Copy setup script
    echo "📤 Copying setup script to $ip..."
    scp -i "$SSH_KEY" -o StrictHostKeyChecking=no aws-miner-setup.sh "$SSH_USER@$ip:/tmp/"

    # Execute setup script
    echo "⚙️ Running setup on $ip..."
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$ip" << EOF
        chmod +x /tmp/aws-miner-setup.sh
        WALLET_ADDRESS="$WALLET_ADDRESS" /tmp/aws-miner-setup.sh

        echo ""
        echo "🎯 Instance $instance_num setup complete!"
        echo "Starting miner service..."
        sudo systemctl start hashnhedge-miner
        sudo systemctl status hashnhedge-miner --no-pager -l
EOF

    if [ $? -eq 0 ]; then
        echo "✅ Instance $instance_num ($ip) deployment successful!"
    else
        echo "❌ Instance $instance_num ($ip) deployment failed!"
    fi
    echo ""
}

# Deploy to all instances
echo "🚀 Starting deployment to all instances..."
echo ""

for i in "${!AWS_IPS[@]}"; do
    instance_num=$((i + 1))
    deploy_to_instance "${AWS_IPS[$i]}" "$instance_num"
done

echo "🎉 Deployment complete!"
echo ""
echo "📊 Monitor your miners:"
echo "   Pool Dashboard: https://hashnhedge.com/pool-dashboard.html"
echo "   Pool API: https://hashnhedge-pool.onrender.com/api/stats"
echo ""
echo "🔧 Manage miners via SSH:"
for i in "${!AWS_IPS[@]}"; do
    instance_num=$((i + 1))
    ip="${AWS_IPS[$i]}"
    echo "   Instance $instance_num ($ip):"
    echo "     ssh -i $SSH_KEY $SSH_USER@$ip"
    echo "     sudo systemctl status hashnhedge-miner"
    echo "     sudo journalctl -f -u hashnhedge-miner"
done
echo ""
echo "Happy mining! ⛏️💰"