
#include <vector>
#include <string>
#include <iostream>
#include <sstream>
#include <iomanip>
#include <fstream>
#include <cctype>
#include <algorithm>
#include <unordered_set>
#include <sys/ioctl.h>
#include <unistd.h>
#include <termios.h>

#define UP 'A'
#define DOWN 'B'
#define RIGHT 'C'
#define LEFT 'D'

/* constants */
constexpr size_t buffer_size = 1024;
const std::unordered_set<char> invalid ( {'\r'} );
const std::string DELIMITER = "\n";

/* ui settings */
size_t gap = 3;
struct termios term = {0};
char * filename;

/* app state */
char buffer[buffer_size] = {0};
int read_size = 0;
std::vector<std::string> lines;
size_t lpos = 0;
size_t nrows;
size_t ncols;

bool char_invalid(char c) {
	return !isascii(c) || invalid.contains(c);
}

void close() {
    // restore normal mode
	term.c_lflag |= ICANON;
	term.c_lflag |= ECHO;
	if (tcsetattr(0, TCSADRAIN, &term) < 0) abort();
    // get back to previous page
	std::cout << "\e[?1049l";
}

class cursel {
public:
	size_t l = 0;
	size_t c = 0;
	size_t tl = 0;
	size_t tc = 0;
	size_t hc = 0;

	cursel(size_t new_l, size_t new_c) {
		l = new_l;
		c = new_c;
	}

	void move(char way) {
		if (way == UP || way == DOWN) {
			if (way == UP && l) --l;
			if (way == DOWN && l < lines.size() - 1) l++;
			// Allow for a little bit of overscroll
			else if (way == DOWN && l == lines.size() - 1 && (int) lpos < (int) lines.size() - ((int) nrows * 2 / 3)) lpos++;
			c = std::min(lines[l].size(), hc);
			if (lpos > l) lpos = l;
			if (lpos + nrows - 2 < l) lpos = l - nrows + 2;
		} else if (way == RIGHT || way == LEFT) {
			if (way == LEFT && c) c--;
			if (way == RIGHT && c < lines[l].size()) c++;
			hc = c;
		} else {
			close();
			std::cout << "unknown way to move " << way << std::endl;
			abort();
		}
	}

	void render(){
		char substitute = lines[l][c];
		if (!substitute) substitute = ' ';
		std::cout << "\e[" << l + 1 - lpos << ";" << c + gap + 3 << "H";
		std::cout << "\e[48;5;214m\e[38;5;16m" << substitute << "\e[0m";
	}

	void input(int length) {
		std::string str(buffer, length);
		str.erase(std::remove_if(str.begin(), str.end(), char_invalid));
		lines[l].insert(c, str);
		c += length;
	}

	void backspace() {
		if (c > 0) {
			lines[l].erase(--c, 1);
			hc = c;
		} else if (l > 0) {
			c = lines[l - 1].size();
			hc = c;
			lines[l - 1] += lines[l];
			lines.erase(lines.begin() + l);
			move(UP);
		}
	}

	void newline() {
		lines.insert(lines.begin() + l + 1, lines[l].substr(c));
		lines[l] = lines[l].substr(0, c);
		c = 0;
		hc = c;
		move(DOWN);
	}

};

cursel cur(0, 0);

void line_nb(std::string number) {
	std::cout << "\e[38;5;237m" << std::setw(gap) << number << " |\e[0m";
}

void clear() {
	std::cout << "\e[H\e[J";
}

void render() {
    // reset cursor to (0,0) \e[J
	std::cout << "\e[H";
    // print lines
	for (size_t i=0; i < (size_t) nrows - 1; i++) {
		if (lpos + i < lines.size()) {
			line_nb(std::to_string(lpos + i + 1));
			std::cout << lines[lpos + i] << "  \e[0K\n";
		} else {
			line_nb("");
			std::cout << "\e[0K\n";
		}
	}
	cur.render();

	std::cout << "\e[" << nrows << ";0H\e[0K";
	for (int i=0; i < read_size; i++)
		switch(buffer[i]) {
			case '\e':
			std::cout << "ESC";
			break;
			case '\b':
			std::cout << "DEL";
			break;
			case '\n':
			std::cout << "CR";
			break;
			default:
			std::cout << " " << +buffer[i] << "=" << buffer[i];
		}
	std::cout.flush();	
}

void init(std::string text) {
	text.erase(std::remove_if(text.begin(), text.end(), char_invalid));
    // get viewport size
	struct winsize w;
	ioctl(STDOUT_FILENO, TIOCGWINSZ, &w);
	nrows = w.ws_row;
	ncols = w.ws_col;
    // open new page 
	std::cout << "\e[?1049h\e[?25l";
    // set terminal to raw mode
	if (tcgetattr(0, &term) < 0) abort();
	term.c_lflag &= ~ICANON;
	term.c_lflag &= ~ECHO;
	term.c_cc[VMIN] = 1;
	term.c_cc[VTIME] = 0;
	if (tcsetattr(0, TCSANOW, &term) < 0) abort();
    // convert input to lines
	size_t last = 0, next = 0; 
	while ((next = text.find(DELIMITER, last)) != std::string::npos) {
		lines.emplace_back(text.substr(last, next-last));
		last = next + 1;
	}
	lines.emplace_back(text.substr(last, text.size()-last));
    // populate screen
	render();
}

void getch() {
	read_size = read(0, &buffer, buffer_size);
}

void save() {
	std::ofstream t(filename);
	for (auto line : lines)
		t << line << '\n';
	t.close();
}

void handle_input() {
	if (buffer[0] == '\e') {
		if (read_size == 3 && buffer[1] == '[')
			cur.move(buffer[2]);
		else if (read_size == 2 && buffer[1] == 1)
			save();
	} else if (buffer[0] == 127) {
		cur.backspace();
	} else if (buffer[0] == '\n') {
		cur.newline();
	} else if (buffer[0] < 0) {

	} else {
		cur.input(read_size);
	}
	render();
}


int main(int argc, char* argv[]) {
	if (argc < 2) return 0;
	filename = argv[1];
  	std::ifstream t(filename);
	std::stringstream ibuf;
	ibuf << t.rdbuf();
	t.close();

    init(ibuf.str());
	while (true) {
		getch();
		if (read_size == 1 && buffer[0] == '\e') break;
		handle_input();
	}

	close();
	return 0;
}