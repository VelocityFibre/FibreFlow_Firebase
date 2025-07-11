# Deploy Command

Handles the complete deployment workflow for FibreFlow using jj and Firebase.

## Usage
```
/deploy [message]
```

## Steps

1. **Check for build errors**
   ```bash
   npm run build
   ```
   If build fails, stop and show errors.

2. **Run lint and format checks**
   ```bash
   npm run lint
   npm run format:check
   ```

3. **Check jj status**
   ```bash
   jj st
   ```
   Show what files have changed.

4. **Create deployment**
   - If message provided: Use it for the commit
   - If no message: Generate from changed files
   
   ```bash
   deploy "<message>"
   ```

5. **Verify deployment**
   - Show deployment URL
   - Remind to check live site
   - Show any deployment warnings

## Error Handling

- **Build errors**: Show TypeScript errors and suggest fixes
- **Lint errors**: Run `npm run lint:fix` automatically
- **Deploy failures**: Check Firebase auth and quota

## Post-Deploy

Always remind user to:
1. Check the live site at https://fibreflow.web.app
2. Verify the feature works as expected
3. Check browser console for any errors

<arguments>
message: Optional deployment message
</arguments>