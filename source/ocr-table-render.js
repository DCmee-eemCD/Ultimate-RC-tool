// Keep recognized cells as text nodes: OCR content is never HTML.
function renderOcrTable(body, segment) {
    const wrapper = document.createElement('div');
    wrapper.className = 'rc-ocr-table-wrap';
    wrapper.tabIndex = 0;
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', 'Bảng được nhận dạng từ ảnh');
    const table = document.createElement('table');
    table.className = 'rc-ocr-table';
    const tbody = document.createElement('tbody');
    segment.rows.forEach((row, index) => {
        const tr = document.createElement('tr');
        const heading = index === 0 && segment.header;
        row.forEach(value => {
            const cell = document.createElement(heading ? 'th' : 'td');
            if (heading) cell.scope = 'col';
            cell.textContent = value;
            tr.appendChild(cell);
        });
        if (heading) {
            const head = document.createElement('thead');
            head.appendChild(tr); table.appendChild(head);
        } else tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrapper.appendChild(table);
    body.appendChild(wrapper);
}
