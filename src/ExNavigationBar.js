import React from 'react';
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewPropTypes,
  SafeAreaView,
} from 'react-native';
import PropTypes from 'prop-types';
import PureComponent from './utils/PureComponent';
import { unsupportedNativeView } from './ExUnsupportedNativeView';
import { withNavigation } from './ExNavigationComponents';

let BlurView;
let expoModule = global.__exponent || global.__expo;
if (expoModule) {
  BlurView = expoModule.BlurView
    ? expoModule.BlurView
    : expoModule.Components.BlurView;
} else {
  BlurView = unsupportedNativeView('BlurView');
}

const useSafeAreaView = (Platform.OS === 'ios' &&
                         parseInt(Platform.Version, 10) >= 11);
const BarContainer = useSafeAreaView
      ? Animated.createAnimatedComponent(SafeAreaView)
      : Animated.View;

// We need to factor the status bar height in with Exponent
// TODO 20 for ios?
const STATUSBAR_HEIGHT = global.__exponent ? 24 : 0;

const APPBAR_HEIGHT = Platform.OS === 'ios' ? 44 : 55;
const BACKGROUND_COLOR = Platform.OS === 'ios' ? '#EFEFF2' : '#FFF';
const BORDER_BOTTOM_COLOR = 'rgba(0, 0, 0, .15)';
const BORDER_BOTTOM_WIDTH = Platform.OS === 'ios'
  ? StyleSheet.hairlineWidth
  : 0;
const BACK_BUTTON_HIT_SLOP = { top: 0, bottom: 0, left: 0, right: 30 };

class ExNavigationBarTitle extends PureComponent {
  render() {
    const { children, style, textStyle, tintColor } = this.props;

    return (
      <View style={[titleStyles.title, style]}>
        <Text
          numberOfLines={1}
          style={[
            titleStyles.titleText,
            tintColor ? { color: tintColor } : null,
            textStyle,
          ]}>
          {children}
        </Text>
      </View>
    );
  }
}

const titleStyles = StyleSheet.create({
  title: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },

  titleText: {
    flex: 1,
    color: 'rgba(0, 0, 0, .9)',
    ...Platform.select({
      ios: {
        fontSize: 17,
        fontWeight: '500',
        textAlign: 'center',
      },
      android: {
        fontSize: 20,
        // fontFamily: 'sans-serif-medium',
        textAlign: 'left',
      },
    }),
  },
});

@withNavigation class ExNavigationBarBackButton extends PureComponent {
  render() {
    const { tintColor } = this.props;

    return (
      <TouchableOpacity
        onPress={this._onPress}
        hitSlop={BACK_BUTTON_HIT_SLOP}
        style={buttonStyles.buttonContainer}>
        <Image
          style={[buttonStyles.button, tintColor ? { tintColor } : null]}
          source={require('./ExNavigationAssets').backIcon}
        />
      </TouchableOpacity>
    );
  }

  _onPress = () => this.props.navigator.pop();
}

class ExNavigationBarMenuButton extends PureComponent {
  render() {
    const { tintColor } = this.props;

    return (
      <TouchableOpacity
        style={buttonStyles.buttonContainer}
        onPress={() => this.props.navigator.toggleDrawer()}>
        <Image
          style={[buttonStyles.menuButton, tintColor ? { tintColor } : null]}
          source={require('./ExNavigationAssets').menuIcon}
        />
      </TouchableOpacity>
    );
  }
}

const buttonStyles = StyleSheet.create({
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    resizeMode: 'contain',
    ...Platform.select({
      ios: {
        height: 21,
        width: 13,
        marginLeft: 8,
        marginRight: 6,
      },
      android: {
        height: 24,
        width: 24,
        margin: 16,
      },
    }),
  },
  menuButton: {
    resizeMode: 'contain',
    ...Platform.select({
      ios: {
        height: 26,
        width: 26,
        marginLeft: 8,
        marginRight: 6,
      },
      android: {
        height: 24,
        width: 24,
        margin: 16,
      },
    }),
  },
});

export default class ExNavigationBar extends PureComponent {
  static defaultProps = {
    renderTitleComponent(props) {
      const { navigationState } = props;
      const title = String(navigationState.title || '');
      return <ExNavigationBarTitle>{title}</ExNavigationBarTitle>;
    },
    barHeight: APPBAR_HEIGHT,
    statusBarHeight: STATUSBAR_HEIGHT,
  };

  static propTypes = {
    renderLeftComponent: PropTypes.func,
    renderRightComponent: PropTypes.func,
    renderTitleComponent: PropTypes.func,
    renderBackgroundComponent: PropTypes.func,
    barHeight: PropTypes.number.isRequired,
    statusBarHeight: PropTypes.number.isRequired,
    style: ViewPropTypes.style,
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      visible: props.visible,
      delta: 0,
    };
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.visible !== nextProps.visible && nextProps.visible) {
      this.setState({
        visible: true,
      });
    }

    if (this.props.navigationState.index !== nextProps.navigationState.index) {
      this.setState({
        delta: nextProps.navigationState.index -
          this.props.navigationState.index,
      });
    } else {
      this.setState({
        delta: 0,
      });
    }
  }

  componentWillUnmount() {
    this.props.position.removeListener(this._positionListener);
  }

  render() {
    if (!this.state.visible) {
      return null;
    }

    const { scenes, style } = this.props;

    const scenesProps = scenes.map(scene => {
      const props = extractSceneRendererProps(this.props);
      props.scene = scene;
      return props;
    });

    // TODO: this should come from the latest scene config
    const height = this.props.barHeight;

    let styleFromRouteConfig = this.props.latestRoute.getBarStyle();
    let isTranslucent = !!this.props.latestRoute.getTranslucent();
    let translucentTint = this.props.latestRoute.getTranslucentTint();
    let backgroundStyle = isTranslucent
      ? styles.appbarTranslucent
      : styles.appbarSolid;
    let containerStyle = [
      styles.appbar,
      backgroundStyle,
      style,
      styleFromRouteConfig,
    ];

    if (this.props.overrideStyle) {
      containerStyle = [style];
    }

    if (!useSafeAreaView) {
      containerStyle.push({paddingTop: this.props.statusBarHeight});
    }

    containerStyle.push(
      this.props.interpolator.forContainer(this.props, this.state.delta)
    );

    let leftComponents = scenesProps.map(this._renderLeft, this);
    let rightComponents = scenesProps.map(this._renderRight, this);
    let titleComponents = scenesProps.map((props, i) => {
      return this._renderTitle(props, {
        hasLeftComponent: leftComponents && !!leftComponents[i],
        hasRightComponent: rightComponents && !!rightComponents[i],
      });
    });

    const backgroundComponents = scenesProps.map(this._renderBackground, this);
    // TODO
    // const blur = isTranslucent && (
    //   <SafeAreaView style={{
    //     position: "absolute",
    //     top: 0,
    //     left: 0,
    //     right: 0
    //   }}>
    //     <BlurView
    //       tint={translucentTint}
    //       intensity={100}
    //       style={StyleSheet.absoluteFill}
    //     />
    //     <View style={{height}} />
    //   </SafeAreaView>
    // );
    // ...
    // <View
    //   style={StyleSheet.absoluteFill}
    //   pointerEvents="box-none"
    // >
    //  {blur}
    //  {bar}
    // </View>

    // TODO "wrapper"
    //     paddingBottom: Platform.OS === 'android' ? 16 : 0,

    return (
      <BarContainer
        style={containerStyle}
        pointerEvents={this.props.visible ? 'auto' : 'none'}
      >
        {backgroundComponents}
        <View style={{height}}>
          {titleComponents}
          {leftComponents}
          {rightComponents}
        </View>
      </BarContainer>
    );
  }

  _renderBackground(props, options) {
    return this._renderSubView(
      props,
      'background',
      this.props.renderBackgroundComponent,
      this.props.interpolator.forBackground,
    );
  }

  _renderLeft(props) {
    return this._renderSubView(
      props,
      'left',
      this.props.renderLeftComponent,
      this.props.interpolator.forLeft
    );
  }

  _renderTitle(props, options) {
    return this._renderSubView(
      props,
      'title',
      this.props.renderTitleComponent,
      this.props.interpolator.forCenter,
      options
    );
  }

  _renderRight(props) {
    return this._renderSubView(
      props,
      'right',
      this.props.renderRightComponent,
      this.props.interpolator.forRight
    );
  }

  _renderSubView(props, name, renderer, styleInterpolator, options = {}) {
    const { scene, navigationState } = props;

    const { index, isStale, key } = scene;

    const offset = navigationState.index - index;

    if (Math.abs(offset) > 2) {
      // Scene is far away from the active scene. Hides it to avoid unnecessary
      // rendering.
      return null;
    }

    const subView = renderer(props);
    if (subView === null) {
      return null;
    }

    let layoutStyle;
    if (name === 'title' && Platform.OS === 'android') {
      layoutStyle = {};

      if (options.hasLeftComponent) {
        layoutStyle.left = APPBAR_HEIGHT;
      }
      if (options.hasRightComponent) {
        layoutStyle.right = APPBAR_HEIGHT;
      }
    }

    const pointerEvents = offset !== 0 || isStale ? 'none' : 'box-none';

    if (name === 'background' && !styleInterpolator) {
      return (
        <View
          pointerEvents={'none'}
          key={name + '_' + key}
          style={[styles[name], layoutStyle]}>
          {subView}
        </View>
      );
    }

    return (
      <Animated.View
        pointerEvents={pointerEvents}
        key={name + '_' + key}
        style={[styles[name], layoutStyle, styleInterpolator(props)]}>
        {subView}
      </Animated.View>
    );
  }
}

ExNavigationBar.DEFAULT_HEIGHT = APPBAR_HEIGHT + STATUSBAR_HEIGHT;
ExNavigationBar.DEFAULT_HEIGHT_WITHOUT_STATUS_BAR = APPBAR_HEIGHT;
ExNavigationBar.DEFAULT_BACKGROUND_COLOR = BACKGROUND_COLOR;
ExNavigationBar.DEFAULT_BORDER_BOTTOM_COLOR = BORDER_BOTTOM_COLOR;
ExNavigationBar.DEFAULT_BORDER_BOTTOM_WIDTH = BORDER_BOTTOM_WIDTH;
ExNavigationBar.Title = ExNavigationBarTitle;
ExNavigationBar.BackButton = ExNavigationBarBackButton;
ExNavigationBar.MenuButton = ExNavigationBarMenuButton;

const styles = StyleSheet.create({

  appbar: {
    borderBottomColor: ExNavigationBar.DEFAULT_BORDER_BOTTOM_COLOR,
    borderBottomWidth: ExNavigationBar.DEFAULT_BORDER_BOTTOM_WIDTH,
    elevation: 4,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  appbarSolid: {
    backgroundColor: ExNavigationBar.DEFAULT_BACKGROUND_COLOR,
  },
  appbarTranslucent: {
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  appbarInnerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  title: {
    bottom: 0,
    position: 'absolute',
    top: 0,
    // NOTE(brentvatne): these hard coded values must change!
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },

  left: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
  },

  right: {
    bottom: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },

  background: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    position: 'absolute',
  },
});

function extractSceneRendererProps(props) {
  return {
    layout: props.layout,
    navigationState: props.navigationState,
    onNavigate: props.onNavigate,
    position: props.position,
    scene: props.scene,
    scenes: props.scenes,
  };
}
