#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}n8n-nodes-taddy Version Bump Script${NC}"
echo "===================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Run this script from the project root.${NC}"
    exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "Current version: ${YELLOW}$CURRENT_VERSION${NC}"

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}Warning: You have uncommitted changes${NC}"
    read -p "Do you want to continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Ask for version bump type
echo ""
echo "Select version bump type:"
echo "1) Patch (x.x.X) - Bug fixes, minor changes"
echo "2) Minor (x.X.0) - New features, backwards compatible"
echo "3) Major (X.0.0) - Breaking changes"
echo "4) Custom version"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        VERSION_TYPE="patch"
        ;;
    2)
        VERSION_TYPE="minor"
        ;;
    3)
        VERSION_TYPE="major"
        ;;
    4)
        read -p "Enter custom version: " CUSTOM_VERSION
        # Validate version format
        if [[ ! $CUSTOM_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo -e "${RED}Error: Invalid version format. Use x.x.x${NC}"
            exit 1
        fi
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

# Update version
if [ "$choice" -eq 4 ]; then
    npm version $CUSTOM_VERSION --no-git-tag-version
else
    npm version $VERSION_TYPE --no-git-tag-version
fi

NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}Version bumped to: $NEW_VERSION${NC}"

# Ask for changelog entry
echo ""
echo "Enter changelog entry (or press Enter to skip):"
read -p "> " CHANGELOG_ENTRY

if [ -n "$CHANGELOG_ENTRY" ]; then
    # Update README.md if it has a version history section
    if grep -q "## Version History" README.md; then
        # Create a temporary file with the new entry
        cat > temp_changelog.txt << EOF

### $NEW_VERSION ($(date +%Y-%m-%d))
- $CHANGELOG_ENTRY
EOF
        
        # Insert after "## Version History" line
        awk '/## Version History/ {print; getline; print; system("cat temp_changelog.txt"); next} 1' README.md > README.tmp
        mv README.tmp README.md
        rm temp_changelog.txt
        echo -e "${GREEN}Updated README.md with changelog entry${NC}"
    fi
fi

# Build and test
echo ""
echo -e "${YELLOW}Building project...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Build successful!${NC}"
else
    echo -e "${RED}Build failed! Please fix errors before publishing.${NC}"
    exit 1
fi

echo -e "${YELLOW}Running linter...${NC}"
npm run lint

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Linting passed!${NC}"
else
    echo -e "${RED}Linting failed! Please fix errors before publishing.${NC}"
    exit 1
fi

# Git operations
echo ""
read -p "Create git commit for version bump? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git add package.json package-lock.json README.md
    git commit -m "chore: bump version to $NEW_VERSION

$CHANGELOG_ENTRY"
    echo -e "${GREEN}Git commit created${NC}"
    
    read -p "Create git tag v$NEW_VERSION? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git tag -a "v$NEW_VERSION" -m "Version $NEW_VERSION"
        echo -e "${GREEN}Git tag created${NC}"
    fi
fi

# Publish
echo ""
echo -e "${YELLOW}Ready to publish version $NEW_VERSION${NC}"
read -p "Publish to npm now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm publish
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Successfully published version $NEW_VERSION!${NC}"
        
        # Push to git
        read -p "Push commits and tags to git? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git push
            git push --tags
            echo -e "${GREEN}Pushed to git${NC}"
        fi
    else
        echo -e "${RED}Publishing failed!${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}Skipped publishing. To publish later, run: npm publish${NC}"
fi

echo ""
echo -e "${GREEN}Version bump complete!${NC}"