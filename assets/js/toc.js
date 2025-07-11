/**
 * Generates a Table of Contents (TOC) from header tags in the main content area.
 * @listens DOMContentLoaded
 */
document.addEventListener('DOMContentLoaded', () => {
    // Find the container for the TOC and the main content area
    const tocContainer = document.getElementById('toc');
    const content = document.getElementById('main-content');

    // If either element is not found, exit the script
    if (!tocContainer || !content) {
        console.warn('TOC container or main content not found. TOC will not be generated.');
        return;
    }

    // Find all header tags (h1, h2, h3) within the main content
    const headers = content.querySelectorAll('h1, h2, h3');
    
    // If no headers are found, display a message
    if (headers.length === 0) {
        tocContainer.innerHTML = '<p>No sections found.</p>';
        return;
    }

    // Create the list for the TOC
    const tocList = document.createElement('ul');
    tocList.className = 'space-y-2';

    headers.forEach(header => {
        // Generate a unique ID for the header if it doesn't have one
        if (!header.id) {
            // Create a slug from the header text (e.g., "Section 1" -> "section-1")
            header.id = header.textContent.trim().toLowerCase()
                .replace(/\s+/g, '-') // Replace spaces with -
                .replace(/[^\w\-]+/g, '') // Remove all non-word chars
                .replace(/\-\-+/g, '-'); // Replace multiple - with single -
        }

        // Create the list item and link for the TOC
        const listItem = document.createElement('li');
        const link = document.createElement('a');

        // Set the link to point to the header's ID
        link.href = `#${header.id}`;
        link.textContent = header.textContent;
        
        // Add styling based on header level for visual hierarchy
        link.className = 'hover:text-blue-600 transition-colors';
        if (header.tagName === 'H2') {
            listItem.className = 'pl-2';
        } else if (header.tagName === 'H3') {
            listItem.className = 'pl-6';
        } else if (header.tagName === 'H1') {
            listItem.className = 'font-bold';
        }

        // Append the link to the list item, and the list item to the TOC list
        listItem.appendChild(link);
        tocList.appendChild(listItem);
    });

    // Append the generated list to the TOC container
    tocContainer.appendChild(tocList);
});
