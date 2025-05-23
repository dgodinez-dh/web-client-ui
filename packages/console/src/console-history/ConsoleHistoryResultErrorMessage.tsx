/**
 * Error message that can be expanded
 */
import React, {
  type KeyboardEvent,
  type MouseEvent,
  PureComponent,
  type ReactElement,
} from 'react';
import classNames from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { vsTriangleRight, vsTriangleDown } from '@deephaven/icons';
import { assertNotNull } from '@deephaven/utils';

interface ConsoleHistoryResultErrorMessageProps {
  message?: string;
}

interface ConsoleHistoryResultErrorMessageState {
  isExpanded: boolean;
  isTriggerHovered: boolean;
}

class ConsoleHistoryResultErrorMessage extends PureComponent<
  ConsoleHistoryResultErrorMessageProps,
  ConsoleHistoryResultErrorMessageState
> {
  static defaultProps = {
    message: '',
  };

  static mouseDragThreshold = 5;

  constructor(props: ConsoleHistoryResultErrorMessageProps) {
    super(props);

    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleToggleError = this.handleToggleError.bind(this);
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);

    this.mouseX = null;
    this.mouseY = null;
    this.isClicking = false;

    this.state = {
      isExpanded: false,
      isTriggerHovered: false,
    };
  }

  mouseX: number | null;

  mouseY: number | null;

  isClicking: boolean;

  handleKeyPress(event: KeyboardEvent<HTMLDivElement>): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        // Toggle the error open/closed
        this.handleToggleError();
        event.stopPropagation();
        event.preventDefault();
        break;
      default:
        break;
    }
  }

  handleMouseDown(event: MouseEvent<HTMLDivElement>): void {
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;
    this.isClicking = true;
  }

  handleMouseMove(event: MouseEvent<HTMLDivElement>): void {
    if (this.mouseX != null && this.mouseY != null) {
      if (
        Math.abs(event.clientX - this.mouseX) >=
          ConsoleHistoryResultErrorMessage.mouseDragThreshold ||
        Math.abs(event.clientY - this.mouseY) >=
          ConsoleHistoryResultErrorMessage.mouseDragThreshold
      ) {
        this.isClicking = false;
      }
    } else if (this.isClicking) {
      // Rare case - could happen if you mouse down, switch window focus, release the mouse, then come back, mouse down outside of the error, drag into the error, then release the mouse
      this.isClicking = false;
    }
  }

  handleMouseUp(event: MouseEvent<HTMLDivElement>): void {
    // We don't want to expand/collapse the error if user is holding shift or an alt key
    // They may be trying to adjust their selection
    if (this.isClicking && !event.shiftKey && !event.metaKey && !event.altKey) {
      this.handleToggleError();
    }
    this.mouseX = null;
    this.mouseY = null;
    this.isClicking = false;
  }

  handleToggleError(): void {
    this.setState(state => ({ isExpanded: !state.isExpanded }));
  }

  handleMouseEnter(): void {
    this.setState({ isTriggerHovered: true });
  }

  handleMouseLeave(): void {
    this.setState({ isTriggerHovered: false });
  }

  render(): ReactElement {
    const { isExpanded, isTriggerHovered } = this.state;
    const { message: messageProp } = this.props;
    assertNotNull(messageProp);
    // Trim trailing whitespace to avoid unnecessary empty lines
    const message = messageProp.trimEnd();
    const lineBreakIndex = message.indexOf('\n');
    const isMultiline = lineBreakIndex > -1;
    let topLineOfMessage = message;
    if (isMultiline) {
      topLineOfMessage = message.slice(0, lineBreakIndex);
    }
    const remainderOfMessage = message.slice(lineBreakIndex);
    const arrowBtnClasses = isTriggerHovered
      ? 'error-btn-link error-btn-link--active'
      : 'error-btn-link';

    return (
      <div
        key="error"
        className={classNames('error-message', {
          expanded: isExpanded,
        })}
      >
        {isMultiline && (
          <>
            <div className="error-gutter">
              <button
                type="button"
                onClick={this.handleToggleError}
                className={arrowBtnClasses}
                tabIndex={-1}
              >
                <FontAwesomeIcon
                  icon={isExpanded ? vsTriangleDown : vsTriangleRight}
                  transform="left-3"
                />
              </button>
            </div>
            <div className="error-content">
              <div
                className="console-error-text-trigger"
                role="button"
                tabIndex={0}
                onKeyPress={this.handleKeyPress}
                onMouseDown={this.handleMouseDown}
                onMouseMove={this.handleMouseMove}
                onMouseEnter={this.handleMouseEnter}
                onMouseLeave={this.handleMouseLeave}
                onMouseUp={this.handleMouseUp}
              >
                {topLineOfMessage}
              </div>
              {isExpanded ? remainderOfMessage : ''}
            </div>
          </>
        )}
        {!isMultiline && (
          <div className="error-content">
            <div className="console-error-text">{topLineOfMessage}</div>
          </div>
        )}
      </div>
    );
  }
}

export default ConsoleHistoryResultErrorMessage;
