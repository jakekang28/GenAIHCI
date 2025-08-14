
export function buildQna(raw) {
  return raw.map((item, idx) => {
    const id = idx + 1
    return {
      id,
      prevId: idx > 0 ? id - 1 : null,
      nextId: idx < raw.length - 1 ? id + 1 : null,
      qcontent: item.question,
      acontent: item.answer,
    }
  })
}