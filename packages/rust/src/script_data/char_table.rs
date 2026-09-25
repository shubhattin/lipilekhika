use alloc::boxed::Box;
use alloc::vec::Vec;

const BLOCK_BITS: u32 = 7;
const BLOCK_SIZE: usize = 1 << BLOCK_BITS;
const BLOCK_MASK: usize = BLOCK_SIZE - 1;
const EMPTY: u16 = u16::MAX;

/// Dense `char -> index` lookup.
///
/// Each script's single-character keys live in ASCII plus a handful of 128-codepoint
/// Unicode blocks (its own block, shared Devanagari punctuation, Vedic marks, ...), so
/// a direct-indexed table per block replaces hashing with one or two array loads.
/// Blocks are ordered by population so the script's primary block is probed first.
#[derive(Debug)]
pub struct CharIndexTable {
    ascii: [u16; BLOCK_SIZE],
    blocks: Box<[(u32, [u16; BLOCK_SIZE])]>,
}

impl Default for CharIndexTable {
    fn default() -> Self {
        Self {
            ascii: [EMPTY; BLOCK_SIZE],
            blocks: Box::new([]),
        }
    }
}

impl CharIndexTable {
    /// Builds the table keeping the first index seen for each char.
    pub fn from_entries(entries: impl IntoIterator<Item = (char, usize)>) -> Self {
        let mut ascii = [EMPTY; BLOCK_SIZE];
        let mut blocks: Vec<(u32, [u16; BLOCK_SIZE], usize)> = Vec::new();

        for (ch, idx) in entries {
            let idx = u16::try_from(idx)
                .ok()
                .filter(|&v| v != EMPTY)
                .expect("CharIndexTable index must fit in u16");
            let c = ch as u32;
            let slot = if c < BLOCK_SIZE as u32 {
                &mut ascii[c as usize]
            } else {
                let block_id = c >> BLOCK_BITS;
                let pos = match blocks.iter().position(|(id, _, _)| *id == block_id) {
                    Some(pos) => pos,
                    None => {
                        blocks.push((block_id, [EMPTY; BLOCK_SIZE], 0));
                        blocks.len() - 1
                    }
                };
                let block = &mut blocks[pos];
                block.2 += 1;
                &mut block.1[c as usize & BLOCK_MASK]
            };
            if *slot == EMPTY {
                *slot = idx;
            }
        }

        blocks.sort_by(|a, b| b.2.cmp(&a.2));
        Self {
            ascii,
            blocks: blocks.into_iter().map(|(id, table, _)| (id, table)).collect(),
        }
    }

    #[inline]
    pub fn get(&self, ch: char) -> Option<usize> {
        let c = ch as u32;
        let v = if c < BLOCK_SIZE as u32 {
            self.ascii[c as usize]
        } else {
            let block_id = c >> BLOCK_BITS;
            match self.blocks.iter().find(|(id, _)| *id == block_id) {
                Some((_, table)) => table[c as usize & BLOCK_MASK],
                None => EMPTY,
            }
        };
        if v == EMPTY { None } else { Some(v as usize) }
    }
}

#[cfg(test)]
mod tests {
    use super::CharIndexTable;
    use alloc::vec;

    #[test]
    fn keeps_first_index_and_rejects_missing_chars() {
        let table = CharIndexTable::from_entries(vec![
            ('a', 0),
            ('क', 1),
            ('a', 2),
            ('𑀓', 3),
            ('।', 4),
            ('क', 5),
        ]);
        assert_eq!(table.get('a'), Some(0));
        assert_eq!(table.get('क'), Some(1));
        assert_eq!(table.get('𑀓'), Some(3));
        assert_eq!(table.get('।'), Some(4));
        assert_eq!(table.get('b'), None);
        assert_eq!(table.get('ख'), None);
        assert_eq!(table.get('অ'), None);
        assert_eq!(CharIndexTable::default().get('a'), None);
    }
}
