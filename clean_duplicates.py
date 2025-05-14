import os

file_path = 'js/scenes/GameScene.js'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the duplicate cleanupIceBlocksArray method
start_line = -1
end_line = -1
for i, line in enumerate(lines):
    if 'cleanupIceBlocksArray' in line and '{' in line and i > 5000:
        start_line = i
        # Find the closing brace
        brace_count = 1
        for j in range(i + 1, len(lines)):
            if '{' in lines[j]:
                brace_count += 1
            if '}' in lines[j]:
                brace_count -= 1
            if brace_count == 0:
                end_line = j
                break
        break

if start_line != -1 and end_line != -1:
    # Replace the method with a comment
    replacement = ['    // This method has been consolidated with the implementation at line 1717\n',
                  '    // to eliminate code duplication\n', '\n']
    lines[start_line:end_line+1] = replacement
    
    # Write the modified content back to a new file
    with open(file_path + '.fixed', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f'Replaced lines {start_line} to {end_line} with comment')
else:
    print('Could not find the duplicate method') 